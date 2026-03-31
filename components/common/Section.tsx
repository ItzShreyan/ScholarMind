"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function Section({ title, subtitle, children }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="mb-8 space-y-2"
      >
        <h2 className="text-3xl font-semibold md:text-4xl">{title}</h2>
        <p className="text-slate-300">{subtitle}</p>
      </motion.div>
      {children}
    </section>
  );
}
