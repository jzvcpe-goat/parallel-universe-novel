# Creator Component Definition Of Done

A Creator component is done when:

- It uses shadcn/Radix primitives where relevant.
- It accepts disabled state when it contains actions.
- It has loading, success, empty, and error presentations when data-driven.
- Heavy or destructive actions use `ConfirmActionDialog`, which must show a
  pending state and product-safe failure copy before closing.
- It uses semantic Creator tokens.
- It has no product-banned UI terms.
- It has no Reader background dependency.
- It can render without fake production data.
- It keeps local-only draft prose out of cloud-facing labels and props.
- It composes shared primitives instead of inventing a parallel Creator UI kit.
- It supports reduced motion and reduced transparency when the component uses
  motion or glass effects.
