import { describe, expect, it } from "vitest";
import { proseMirrorToText } from "./proseMirror.js";
import { mapTaskCommentsResponse } from "./commentMapper.js";

const olgaCommentDoc = {
  type: "doc",
  content: [
    {
      type: "image",
      attrs: {
        id: "a25fc884-0349-4c07-acac-6eb3ce8b58e3",
        link: "https://api.weeek.net/ws/846240/files/a25fc884-0349-4c07-acac-6eb3ce8b58e3",
        name: "Снимок экрана 2026-07-29 135442.png",
        size: 22294,
      },
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "У Сергея Кочегарова рассинхрон статусов. В ЕЦД он пользователь с недоработанными документами, а АЧПП - ему присвоен статус Участника.",
        },
      ],
    },
  ],
};

describe("proseMirrorToText", () => {
  it("extracts text and images from TipTap doc", () => {
    const { text, images } = proseMirrorToText(olgaCommentDoc);
    expect(text).toContain("рассинхрон статусов");
    expect(images).toHaveLength(1);
    expect(images[0]?.id).toBe("a25fc884-0349-4c07-acac-6eb3ce8b58e3");
    expect(images[0]?.name).toContain("Снимок");
  });
});

describe("mapTaskCommentsResponse", () => {
  it("maps private task envelope comments", () => {
    const result = mapTaskCommentsResponse(253, {
      success: true,
      task: {
        id: 253,
        commentsCount: 2,
        comments: [
          {
            id: 129,
            parentId: null,
            userId: "9fc86b36-302f-4170-9ea1-b6c426b09f43",
            sentAt: "2026-07-29T10:58:20Z",
            isUpdated: false,
            user: {
              id: "9fc86b36-302f-4170-9ea1-b6c426b09f43",
              email: "bajwa@yandex.ru",
              name: "Olga Bajwa",
            },
            content: { data: olgaCommentDoc, version: 1 },
          },
          {
            id: 130,
            parentId: null,
            userId: "9fc86b36-302f-4170-9ea1-b6c426b09f43",
            sentAt: "2026-07-29T10:59:51Z",
            isUpdated: false,
            user: { name: "Olga Bajwa", email: "bajwa@yandex.ru" },
            content: {
              data: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Он не может добавить страницу практики" }],
                  },
                ],
              },
            },
          },
        ],
      },
    });

    expect(result.commentsCount).toBe(2);
    expect(result.comments).toHaveLength(2);
    expect(result.comments[0]?.authorName).toBe("Olga Bajwa");
    expect(result.comments[0]?.text).toContain("рассинхрон");
    expect(result.comments[0]?.images).toHaveLength(1);
    expect(result.comments[1]?.text).toContain("страницу практики");
  });
});
