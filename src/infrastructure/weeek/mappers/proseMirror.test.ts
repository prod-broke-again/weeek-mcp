import { describe, expect, it } from "vitest";
import { proseMirrorToMarkdown, proseMirrorToText } from "./proseMirror.js";
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

describe("proseMirrorToMarkdown", () => {
  it("converts headings of various levels", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Заголовок 1" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Заголовок 2" }],
        },
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Заголовок 3" }],
        },
      ],
    };

    const md = proseMirrorToMarkdown(doc);
    expect(md).toBe("# Заголовок 1\n\n## Заголовок 2\n\n### Заголовок 3");
  });

  it("converts formatted text with marks", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Обычный, " },
            { type: "text", text: "жирный", marks: [{ type: "bold" }] },
            { type: "text", text: " и " },
            { type: "text", text: "курсивный", marks: [{ type: "italic" }] },
            {
              type: "text",
              text: " жирный курсив",
              marks: [{ type: "bold" }, { type: "italic" }],
            },
            { type: "text", text: " и " },
            { type: "text", text: "код", marks: [{ type: "code" }] },
            {
              type: "text",
              text: "ссылка",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
      ],
    };

    const md = proseMirrorToMarkdown(doc);
    expect(md).toContain("**жирный**");
    expect(md).toContain("*курсивный*");
    expect(md).toContain("`код`");
    expect(md).toContain("[ссылка](https://example.com)");
  });

  it("converts images with link and caption", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: {
            link: "https://api.weeek.net/ws/846240/files/file-uuid-123",
          },
          content: [{ type: "text", text: "Подпись к картинке" }],
        },
        {
          type: "image",
          attrs: {
            link: "https://api.weeek.net/ws/846240/files/file-uuid-456",
            name: "Fallback name",
          },
        },
      ],
    };

    const md = proseMirrorToMarkdown(doc);
    expect(md).toBe(
      "![Подпись к картинке](https://api.weeek.net/ws/846240/files/file-uuid-123)\n\n![Fallback name](https://api.weeek.net/ws/846240/files/file-uuid-456)",
    );
  });

  it("converts line-breaks and paragraphs", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Первая строка" },
            { type: "line-break" },
            { type: "text", text: "Вторая строка того же абзаца" },
          ],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Второй абзац" }],
        },
      ],
    };

    const md = proseMirrorToMarkdown(doc);
    expect(md).toBe("Первая строка\nВторая строка того же абзаца\n\nВторой абзац");
  });

  it("handles content.data.content structure directly", () => {
    const input = {
      data: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Раздел документа" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Содержимое документа" }],
          },
        ],
      },
    };

    const md = proseMirrorToMarkdown(input);
    expect(md).toBe("## Раздел документа\n\nСодержимое документа");
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
