import type { ReactNode } from "react";
import { Modal as MModal } from "@mantine/core";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}

export function Modal({ open, title, onClose, children, footer, maxWidth = 560 }: Props) {
  return (
    <MModal
      opened={open}
      onClose={onClose}
      title={title}
      size={maxWidth > 600 ? "lg" : "md"}
      centered
      withinPortal
      overlayProps={{ backgroundOpacity: 0.5, blur: 0 }}
    >
      <div>{children}</div>
      {footer && (
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
          {footer}
        </div>
      )}
    </MModal>
  );
}
