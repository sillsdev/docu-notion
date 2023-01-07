import { convertOneBlock } from "../TestRun";
import { standardColumnTransformer } from "./ColumnTransformer";

test("makes a table blah blah", async () => {
  const block = `object: "block",
    id: "20b821b4-7c5b-41dc-8e30-92c23c125580",
    parent: { type: "page_id", page_id: "9dd05134-0401-47f6-b159-1e6b76b9aad3" },
    created_time: "2022-07-25T23:05:00.000Z",
    last_edited_time: "2022-07-26T15:31:00.000Z",
    created_by: { object: "user", id: "11fb7f16-0560-4aee-ab88-ed75a850cfc4" },
    last_edited_by: {
      object: "user",
      id: "11fb7f16-0560-4aee-ab88-ed75a850cfc4",
    },
    has_children: false,`;
  const config = { plugins: [standardColumnTransformer] };
  const results = await convertOneBlock(block, config);
  expect(results).toContain("foo");
});
