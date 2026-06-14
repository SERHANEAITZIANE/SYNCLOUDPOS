import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "DZD",
})

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DA";
}

export function scrollIntoViewSafe(element: HTMLElement | null) {
  if (!element) return;

  // Find the closest scrollable ancestor that is NOT body or html
  let parent: HTMLElement | null = element.parentElement;
  while (parent) {
    const isRadixViewport = parent.hasAttribute('data-radix-scroll-area-viewport');
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const isScrollable = overflowY === 'auto' || overflowY === 'scroll' || isRadixViewport;

    if (isScrollable && parent.tagName !== 'BODY' && parent.tagName !== 'HTML') {
      break;
    }
    parent = parent.parentElement;
  }

  if (!parent) return;

  const parentRect = parent.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();

  // Calculate the element's position relative to the scroll container's content
  const elementTop = elementRect.top - parentRect.top + parent.scrollTop;
  const elementBottom = elementTop + elementRect.height;

  const viewTop = parent.scrollTop;
  const viewBottom = viewTop + parentRect.height;

  if (elementTop < viewTop) {
    // Element is above the visible area, scroll up to align its top
    parent.scrollTo({
      top: Math.max(0, elementTop - 8),
      behavior: "smooth"
    });
  } else if (elementBottom > viewBottom) {
    // Element is below the visible area, scroll down to align its bottom
    parent.scrollTo({
      top: elementBottom - parentRect.height + 8,
      behavior: "smooth"
    });
  }
}

