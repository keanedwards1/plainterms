export type RiskTone = "low" | "medium" | "high";

export function riskLabelClass(label: RiskTone) {
  if (label === "high") return "bg-[#fbe1d6] text-[#a63a1e] border-[#efc1b0]";
  if (label === "medium") return "bg-[#f9ebc6] text-[#8a5a0b] border-[#ecd9a6]";
  return "bg-[#d9eddc] text-[#23604a] border-[#b9dcc1]";
}

export function riskMeterClass(label: RiskTone) {
  if (label === "high") return "bg-[#e9783a]";
  if (label === "medium") return "bg-[#d8a84b]";
  return "bg-[#4f9a62]";
}

export function recommendationToneClass(tone: RiskTone) {
  if (tone === "high") return "bg-[#fbe1d6] text-[#a63a1e] border-[#efc1b0]";
  if (tone === "medium") return "bg-[#f9ebc6] text-[#8a5a0b] border-[#ecd9a6]";
  return "bg-[#d9eddc] text-[#23604a] border-[#b9dcc1]";
}
