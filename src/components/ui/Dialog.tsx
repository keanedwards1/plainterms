"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Light dismiss (click outside) is on unless the dialog guards an in-progress action. */
  dismissible?: boolean;
};

/**
 * Modal built on the native <dialog>: the browser provides focus containment,
 * an inert page, Esc/back-gesture dismissal and focus return to the opener.
 */
export default function Dialog({ open, onClose, title, description, children, dismissible = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return undefined;
    const handleClose = () => onClose();
    const handleCancel = (event: Event) => {
      if (!dismissible) event.preventDefault();
    };
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [onClose, dismissible]);

  // Light dismiss for browsers without `closedby`. Tests the pointer position,
  // because the dialog itself is the event target for its own padding.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !dismissible || "closedBy" in HTMLDialogElement.prototype) return undefined;
    let pressedOutside = false;
    const outside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    const down = (e: PointerEvent) => {
      pressedOutside = outside(e);
    };
    const up = (e: PointerEvent) => {
      if (pressedOutside && outside(e)) dialog.close();
    };
    dialog.addEventListener("pointerdown", down);
    dialog.addEventListener("pointerup", up);
    return () => {
      dialog.removeEventListener("pointerdown", down);
      dialog.removeEventListener("pointerup", up);
    };
  }, [dismissible]);

  return (
    <dialog
      ref={ref}
      className="pt-dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      {...({ closedby: dismissible ? "any" : "none" } as Record<string, string>)}
    >
      <div className="p-6 sm:p-7">
        <h1 id={titleId} className="text-2xl leading-tight text-[var(--pt-ink)]">
          {title}
        </h1>
        {description ? (
          <div id={descriptionId} className="mt-2 text-[15px] leading-6 text-[var(--pt-muted)]">
            {description}
          </div>
        ) : null}
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
    </dialog>
  );
}
