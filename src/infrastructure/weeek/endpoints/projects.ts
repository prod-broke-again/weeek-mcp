export const projectsList = { path: "/tm/projects", envelopeKey: "projects" as const };
export const projectById = (id: number) => ({
  path: `/tm/projects/${id}`,
  envelopeKey: "project" as const,
});
export const boardsList = { path: "/tm/boards", envelopeKey: "boards" as const };
export const boardColumnsList = {
  path: "/tm/board-columns",
  envelopeKey: "boardColumns" as const,
};
