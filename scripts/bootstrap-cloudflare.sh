#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${EZPAY_CF_PROJECT:-ezpay}"
DB_NAME="${EZPAY_D1_NAME:-EZPAY_DB}"
PRODUCTION_BRANCH="${EZPAY_CF_BRANCH:-cloudflare-pages}"

required=(
  CLOUDFLARE_API_TOKEN
  CLOUDFLARE_ACCOUNT_ID
  EZPAY_OWNER_EMAIL
  EZPAY_OWNER_PASSWORD
  EZPAY_WEBHOOK_SIGNING_SECRET
  EZPAY_INTERNAL_JOB_SECRET
)

for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "Missing required environment variable: $key" >&2
    exit 1
  fi
done

WRANGLER="npx --yes wrangler@latest"

echo "Checking D1 database..."
DB_ID="$(
  $WRANGLER d1 list --json |
  node -e '
    let data="";
    process.stdin.on("data",d=>data+=d);
    process.stdin.on("end",()=>{
      const name=process.argv[1];
      const rows=JSON.parse(data);
      const db=rows.find(x=>x.name===name);
      if(db) process.stdout.write(db.uuid||db.id||"");
    });
  ' "$DB_NAME"
)"

if [[ -z "$DB_ID" ]]; then
  echo "Creating D1 database $DB_NAME..."
  $WRANGLER d1 create "$DB_NAME"
  DB_ID="$(
    $WRANGLER d1 list --json |
    node -e '
      let data="";
      process.stdin.on("data",d=>data+=d);
      process.stdin.on("end",()=>{
        const name=process.argv[1];
        const rows=JSON.parse(data);
        const db=rows.find(x=>x.name===name);
        if(!db) process.exit(2);
        process.stdout.write(db.uuid||db.id||"");
      });
    ' "$DB_NAME"
  )"
fi

echo "Using D1 database: $DB_ID"

cat > wrangler.toml <<EOF
name = "$PROJECT_NAME"
pages_build_output_dir = "./public"
compatibility_date = "2026-10-02"

[[d1_databases]]
binding = "DB"
database_name = "$DB_NAME"
database_id = "$DB_ID"
EOF

echo "Checking Pages project..."
PROJECT_EXISTS="$(
  $WRANGLER pages project list --json |
  node -e '
    let data="";
    process.stdin.on("data",d=>data+=d);
    process.stdin.on("end",()=>{
      const name=process.argv[1];
      const rows=JSON.parse(data);
      process.stdout.write(rows.some(x=>x.name===name)?"yes":"no");
    });
  ' "$PROJECT_NAME"
)"

if [[ "$PROJECT_EXISTS" != "yes" ]]; then
  $WRANGLER pages project create "$PROJECT_NAME"     --production-branch "$PRODUCTION_BRANCH"     --compatibility-date "2026-10-02"
fi

put_secret() {
  local name="$1"
  local value="$2"
  printf '%s' "$value" | $WRANGLER pages secret put "$name" --project-name "$PROJECT_NAME"
}

echo "Uploading EZPay secrets..."
put_secret EZPAY_OWNER_EMAIL "$EZPAY_OWNER_EMAIL"
put_secret EZPAY_OWNER_PASSWORD "$EZPAY_OWNER_PASSWORD"
put_secret EZPAY_WEBHOOK_SIGNING_SECRET "$EZPAY_WEBHOOK_SIGNING_SECRET"
put_secret EZPAY_INTERNAL_JOB_SECRET "$EZPAY_INTERNAL_JOB_SECRET"
put_secret EZPAY_SESSION_HOURS "${EZPAY_SESSION_HOURS:-12}"

echo "Applying D1 migrations..."
$WRANGLER d1 migrations apply "$DB_NAME" --remote --config wrangler.toml

echo "Building Pages assets..."
npm run build

echo "Deploying EZPay to Cloudflare Pages..."
$WRANGLER pages deploy public   --project-name "$PROJECT_NAME"   --branch "$PRODUCTION_BRANCH"   --config wrangler.toml

echo
echo "EZPay deployment complete."
echo "Project: $PROJECT_NAME"
echo "Database: $DB_NAME ($DB_ID)"
