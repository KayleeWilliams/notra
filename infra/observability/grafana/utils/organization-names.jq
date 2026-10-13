(try (
   if ($ARGS.named | has("organizationNames")) then
     if ($ARGS.named.organizationNames | length) != 1 then
       error("Organization mapping file must contain exactly one JSON value")
     else $ARGS.named.organizationNames[0] end
   else
     (env.NOTRA_ORGANIZATION_NAMES // "")
     | if . == "" then {} else fromjson end
   end)
 catch error("Invalid organization name mapping JSON")) as $names
| if ($names | type) != "object" then
    error("Organization names must be an ID-to-name object")
  elif ($names | length) > 10000 then
    error("Organization name mapping exceeds the limit")
  elif any($names | to_entries[];
    (.key | length) == 0 or (.key | length) > 256 or
    (.value | type) != "string") then
    error("Invalid organization name mapping")
  elif any($names[]; length > 256 or contains("${") or test("[\u0000-\u001f\u007f-\u009f]")) then
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
