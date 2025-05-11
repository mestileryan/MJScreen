// tooltip.ts
import type { Directive } from 'vue';
import tippy from 'tippy.js';
import type { Instance, Props } from 'tippy.js';

const tooltip: Directive<HTMLElement, string> = {
  mounted(el, binding) {
    // delay [show, hide] : on veut instant show, un petit délai hide
    const opts: Partial<Props> = { content: binding.value, delay: [0, 100] };
    const tip: Instance = tippy(el, opts);
    // stocker l’instance pour cleanup
    (el as any)._tippyInstance = tip;
  },
  updated(el, binding) {
    // si le contenu change
    const tip: Instance | undefined = (el as any)._tippyInstance;
    tip?.setContent(binding.value);
  },
  beforeUnmount(el) {
    (el as any)._tippyInstance?.destroy();
  }
};

export default tooltip;
