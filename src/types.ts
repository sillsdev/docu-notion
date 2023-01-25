import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export type NotionBlock = BlockObjectResponse;
export type ICounts = {
  output_normally: number;
  skipped_because_empty: number;
  skipped_because_status: number;
  skipped_because_level_cannot_have_content: number;
};
