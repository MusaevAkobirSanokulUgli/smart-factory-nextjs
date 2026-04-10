"use client";

type EntityType = "equipment" | "parts" | "actions" | "quantities";

interface EntityTagProps {
  text: string;
  type: EntityType;
}

export default function EntityTag({ text, type }: EntityTagProps) {
  return <span className={`entity-tag ${type}`}>{text}</span>;
}
