#!/bin/bash
#set -x
#
#apt-get install jq -y
#
#files=($(ls "$(dirname ${BASH_SOURCE[0]})/dynamodb/"))
#
#for json_file_name in "${files[@]}"; do
#  file_path=$(dirname "${BASH_SOURCE[0]}")/dynamodb/${json_file_name}
#  table_name=$(jq -r '.TableName' "$file_path")
#  # start fresh and delete the table if it exists
#  awslocal dynamodb delete-table --table-name ${table_name} || true
#  awslocal dynamodb create-table --cli-input-json file://$file_path
#done
#
#set +x
#!/bin/bash
set -x

# for now, only prospect api required dynamodb from content services
TABLE_DEFINITIONS=(
  'prospect_api_prospects'
)

for json_file in "${TABLE_DEFINITIONS[@]}"; do
  # start fresh and delete the table if it exists
  awslocal dynamodb delete-table --table-name ${json_file} || true
  awslocal dynamodb create-table --cli-input-json file://$(dirname "${BASH_SOURCE[0]}")/dynamodb/${json_file}.json
done

set +x