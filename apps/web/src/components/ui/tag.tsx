import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tagVariants = cva(
  [
    "inline-flex items-center justify-center rounded-full font-medium transition-colors",
    "backdrop-blur-[2px] relative overflow-hidden",
    "shadow-[0_2px_4px_rgba(0,0,0,0.02)]",
    "before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:to-transparent before:opacity-40",
    "after:absolute after:inset-0 after:rounded-full after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
  ].join(" "),
  {
    variants: {
      variant: {
        grey: [
          "bg-gray-100/80 text-gray-900",
          "shadow-[0_2px_4px_rgba(0,0,0,0.02),inset_0_1px_2px_rgba(0,0,0,0.06)]",
          "after:bg-gradient-to-b after:from-gray-500/5 after:to-gray-500/10"
        ],
        orange: [
          "bg-orange-100/80 text-orange-900",
          "shadow-[0_2px_4px_rgba(251,146,60,0.02),inset_0_1px_2px_rgba(251,146,60,0.06)]",
          "after:bg-gradient-to-b after:from-orange-500/5 after:to-orange-500/10"
        ],
        yellow: [
          "bg-yellow-100/80 text-yellow-900",
          "shadow-[0_2px_4px_rgba(234,179,8,0.02),inset_0_1px_2px_rgba(234,179,8,0.06)]",
          "after:bg-gradient-to-b after:from-yellow-500/5 after:to-yellow-500/10"
        ],
        blue: [
          "bg-blue-100/80 text-blue-900",
          "shadow-[0_2px_4px_rgba(59,130,246,0.02),inset_0_1px_2px_rgba(59,130,246,0.06)]",
          "after:bg-gradient-to-b after:from-blue-500/5 after:to-blue-500/10"
        ],
        purple: [
          "bg-purple-100/80 text-purple-900",
          "shadow-[0_2px_4px_rgba(168,85,247,0.02),inset_0_1px_2px_rgba(168,85,247,0.06)]",
          "after:bg-gradient-to-b after:from-purple-500/5 after:to-purple-500/10"
        ],
        pink: [
          "bg-pink-100/80 text-pink-900",
          "shadow-[0_2px_4px_rgba(236,72,153,0.02),inset_0_1px_2px_rgba(236,72,153,0.06)]",
          "after:bg-gradient-to-b after:from-pink-500/5 after:to-pink-500/10"
        ],
        green: [
          "bg-green-100/80 text-green-900",
          "shadow-[0_2px_4px_rgba(34,197,94,0.02),inset_0_1px_2px_rgba(34,197,94,0.06)]",
          "after:bg-gradient-to-b after:from-green-500/5 after:to-green-500/10"
        ],
      },
      size: {
        sm: "text-xs px-2.5 py-0.5 shadow-sm",
        md: "text-sm px-3 py-1",
        lg: "text-base px-4 py-1.5 shadow-md"
      }
    },
    defaultVariants: {
      variant: "grey",
      size: "md"
    }
  }
)

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {
  children: React.ReactNode
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(tagVariants({ variant, size, className }))}
        {...props}
      >
        <span className="relative z-10 text-xs font-mono tracking-tighter">{children}</span>
      </span>
    )
  }
)
Tag.displayName = "Tag"

export { Tag, tagVariants } 