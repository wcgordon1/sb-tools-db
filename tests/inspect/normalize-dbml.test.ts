import { describe, expect, it } from "vitest";
import { normalizeDbmlForViewer } from "@/lib/inspect/normalize-dbml";

describe("normalizeDbmlForViewer", () => {
  it("normalizes parser-breaking type tokens inside table field lines", () => {
    const input = `Project "launch-club-v2" {
  database_type: "Bubble.io"
}

Table custom."User" {
  "_id" varchar
  "temp-google?" varchar
  "referral Used" boolean
  "image" image
  "receipt" file
  "period" date_range
  "related-keywords" varchar[]
  "report_posts_list" api.apiconnector2.bTRqt.bTrUd1.posts[]
  "user-keyword" custom.keyword[]
  "user-role" option.user_role_os
  "Users referred" user.id[]
}

Ref: custom."User"."Users referred" < custom."User"."_id"`;

    const output = normalizeDbmlForViewer(input);

    expect(output).toContain(`"referral Used" bool`);
    expect(output).toContain(`"image" bubble_image`);
    expect(output).toContain(`"receipt" bubble_file`);
    expect(output).toContain(`"period" bubble_date_range`);
    expect(output).toContain(`"related-keywords" string[]`);
    expect(output).toContain(
      `"report_posts_list" api."apiconnector2.bTRqt.bTrUd1.posts"`,
    );
    expect(output).toContain(`"user-keyword" keyword.id`);
    expect(output).toContain(`"user-role" user_role_os.id`);
    expect(output).toContain(`"Users referred" user.id`);
  });

  it("does not change non-target lines", () => {
    const input = `Project "x" {
  database_type: "Bubble.io"
}

Ref: custom."User"."Users referred" < custom."User"."_id"
Table custom."User" {
  "_id" varchar
}`;

    const output = normalizeDbmlForViewer(input);

    expect(output).toContain(`Project "x" {`);
    expect(output).toContain(
      `Ref: custom."User"."Users referred" < custom."User"."_id"`,
    );
    expect(output).toContain(`Table custom."User" {`);
  });

  it("is idempotent", () => {
    const input = `Table custom."User" {
  "report_posts_list" api.apiconnector2.bTRqt.bTrUd1.posts[]
  "user-keyword" custom.keyword[]
  "user-role" option.user_role_os
  "Users referred" user.id[]
  "enabled" boolean
}`;

    const once = normalizeDbmlForViewer(input);
    const twice = normalizeDbmlForViewer(once);

    expect(twice).toBe(once);
  });

  it("removes duplicate deleted variants and keeps canonical field per table", () => {
    const input = `Table custom."🏢 Company Billing" {
  "_id" varchar
  "x-custom-privacy-policy - deleted - deleted" bubble_file
  "x-custom-privacy-policy - deleted - deleted" _billfly_docs.id
  "x-custom-terms-conditions - deleted - deleted" bubble_file
  "x-custom-terms-conditions - deleted - deleted" _billfly_docs.id
  "x-custom-subscriber-agreement - deleted - deleted" bubble_file
  "x-custom-subscriber-agreement - deleted - deleted" _billfly_docs.id
  "x-custom-subscriber-agreement - deleted" _billfly_docs.id
}

Table custom."_WorkOrder" {
  "_id" varchar
  "F_Paused - deleted" _workorder_paused.id
  "F_Paused - deleted" _workorder_paused.id
}`;

    const output = normalizeDbmlForViewer(input);

    expect(output.match(/x-custom-privacy-policy - deleted - deleted/g)?.length).toBe(1);
    expect(output.match(/x-custom-terms-conditions - deleted - deleted/g)?.length).toBe(1);
    expect(output.match(/x-custom-subscriber-agreement - deleted - deleted/g)?.length).toBe(1);
    expect(
      output.match(/x-custom-subscriber-agreement - deleted"/g)?.length ?? 0,
    ).toBe(0);
    expect(output.match(/F_Paused - deleted/g)?.length).toBe(1);
  });
});
