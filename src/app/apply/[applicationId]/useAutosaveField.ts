"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveAnswer } from "@/app/actions/applications";

const DEBOUNCE_MS = 700;

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutosaveField(
  applicationId: string,
  questionId: string,
  initialValue: unknown,
  opts: {
    readOnly: boolean;
    onPending: (questionId: string, value: unknown) => void;
    onFlushed: (questionId: string) => void;
  }
) {
  const [value, setValue] = useState(initialValue);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValue = useRef(value);
  latestValue.current = value;

  const flush = useCallback(
    (v: unknown) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (opts.readOnly) return;
      setStatus("saving");
      saveAnswer(applicationId, questionId, v).then((res) => {
        opts.onFlushed(questionId);
        setStatus(res && "error" in res && res.error ? "error" : "saved");
      });
    },
    [applicationId, questionId, opts]
  );

  const onChange = useCallback(
    (v: unknown) => {
      setValue(v);
      setStatus("idle");
      opts.onPending(questionId, v);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => flush(v), DEBOUNCE_MS);
    },
    [flush, opts, questionId]
  );

  const onBlur = useCallback(() => flush(latestValue.current), [flush]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { value, onChange, onBlur, status };
}
