export const attachmentById = (fileId: string) => ({
  path: `/ws/attachments/${fileId}`,
  envelopeKey: "data" as const,
});
