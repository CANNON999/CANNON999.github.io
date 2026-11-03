import { canOpenHub } from '../lib/project-hub.ts';

export function bindCoverSelection(tabs: HTMLAnchorElement[], select: (index: number) => void, isLoading: () => boolean) {
  tabs.forEach((tab, index) => tab.addEventListener('click', event => {
    if (!canOpenHub(event)) return;
    event.preventDefault();
    if (!isLoading()) select(index);
  }));
}
