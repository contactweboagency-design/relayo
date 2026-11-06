export function kindLabel(kind: string) {
  return (
    {
      dm: "DM",
      comment: "commentaire",
      story_reply: "réponse story",
      button: "clic bouton",
      private_reply: "réponse privée",
      comment_reply: "réponse publique",
    } as Record<string, string>
  )[kind] ?? kind;
}
