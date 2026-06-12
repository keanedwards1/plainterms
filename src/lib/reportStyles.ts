export type RiskTone = "low" | "medium" | "high";

export function riskLabelClass(label: RiskTone) {
  if (label === "high") return "bg-[#ffe8e3] text-[#9e3f2d] border-[#efc1b6]";
  if (label === "medium") return "bg-[#fff4df] text-[#8c6526] border-[#ead3a1]";
  return "bg-[#e1f4ef] text-[#1d655f] border-[#b2ddd4]";
}

export function riskMeterClass(label: RiskTone) {
  if (label === "high") return "bg-[#e7745c]";
  if (label === "medium") return "bg-[#d8a84b]";
  return "bg-[#2ba59f]";
}

export function recommendationToneClass(tone: RiskTone) {
  if (tone === "high") return "bg-[#ffe8e3] text-[#9e3f2d] border-[#efc1b6]";
  if (tone === "medium") return "bg-[#fff4df] text-[#8c6526] border-[#ead3a1]";
  return "bg-[#e1f4ef] text-[#1d655f] border-[#b2ddd4]";
}
