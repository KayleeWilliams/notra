(try ($ARGS.named.organizationNames[0] // (env.NOTRA_ORGANIZATION_NAMES // "{}" | fromjson))
 catch error("Invalid organization name mapping JSON")) as $names
| if ($names | type) != "object" then
    error("Organization names must be an ID-to-name object")
  elif ($names | length) > 10000 then
    error("Organization name mapping exceeds the limit")
  elif any($names | to_entries[];
    (.key | length) == 0 or (.key | length) > 256 or
    (.value | type) != "string") then
    error("Invalid organization name mapping")
  elif any($names[]; length > 256 or contains("${") or test("[\\x00-\\x1f\\x7f]")) then
    error("Invalid organization display name")
  else
    [$names | to_entries[] | select(.value | test("\\S")) |
      {matcher: {id: "byName", options: .key},
       properties: [{id: "displayName", value: .value}]}] as $overrides
    | walk(if type == "object" and ($overrides | length) > 0 and
      .fieldConfig.defaults.displayName? == "${__field.labels.organizationId}" then
      .fieldConfig.overrides = ((.fieldConfig.overrides // []) + $overrides)
    else . end)
  end
