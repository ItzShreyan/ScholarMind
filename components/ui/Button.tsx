"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { buttonVariants, type Variant, type Size } from "@/components/ui/button-variants";

export { buttonVariants, type Variant, type Size };

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: HTMLMotionProps<"button"> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={buttonVariants({ className, variant, size })} 
      {...props} 
    />
  );
}
