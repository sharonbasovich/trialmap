export function finding(a) {
  if (a.unitUncertain && a.oneTreatment)
    return {
      kind: "unknown",
      title: "Two questions before comparing A and B.",
      text: "Both A and B need to be present to compare them. This layout contains only one treatment. Also, shared or unknown treatment application means the independent treatment unit is not yet clear.",
      small: "Clarify what receives treatment independently with your teacher; adding the other treatment alone will not settle that question.",
    };
  if (a.unitUncertain)
    return {
      kind: "unknown",
      title: "First, identify the treatment unit.",
      text: "Shared treatment can make a tray or reservoir the experimental unit. The number of independent units is unknown here, even though the pot and reading counts are known.",
      small:
        "Clarify this assumption with your teacher before interpreting the layout.",
    };
  if (a.oneTreatment)
    return {
      kind: "unknown",
      title: "The comparison is missing a treatment.",
      text: "Both A and B need to be present to compare them. This layout currently contains only one treatment.",
      small: "No claim about sample adequacy is made.",
    };
  if (a.completeConfounding)
    return {
      kind: "confounded",
      title: "Treatment and shelf are tangled.",
      text: "Every A pot is on one shelf; every B pot is on the other. A growth difference could be treatment, location, or both.",
      small: "More readings will not separate those explanations.",
    };
  return {
    kind: "mixed",
    title: "This complete confounding is absent.",
    text: "The declared layout no longer separates A and B entirely by shelf. That removes this specific pattern, not every possible design flaw.",
    small: a.imbalance
      ? "Treatment pot counts differ. Unequal counts need thoughtful planning."
      : "Equal pot counts do not establish enough independent trials.",
  };
}

export function nextQuestion(a) {
  if (a.unitUncertain && a.oneTreatment)
    return "What receives treatment independently: each pot, a tray, or something else? Which units will receive A, and which will receive B?";
  if (a.unitUncertain) return "What receives treatment independently: each pot, a tray, or something else?";
  if (a.oneTreatment) return "Which pots will receive the other treatment?";
  if (a.completeConfounding) return "Could you place both treatments on both shelves, then ask your teacher about random allocation?";
  return "How will you assign treatments, keep measurements consistent, and account for other environmental differences?";
}
