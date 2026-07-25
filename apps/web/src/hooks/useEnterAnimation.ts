import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

// 注册 useGSAP hook（内部会做 context 清理，避免内存泄漏与重复动画）
gsap.registerPlugin(useGSAP);

/** 克制专业风格的统一时长/缓动 */
const DURATION = 0.35;
const EASE = 'power2.out';

interface EnterOptions {
  /** 入场距离（px），默认 16 */
  y?: number;
  /** 错峰：每个子元素延迟（秒）。提供则对 scope 内的 [data-anim] 元素依次入场 */
  stagger?: number;
  /** 额外延迟（秒） */
  delay?: number;
}

/**
 * 通用入场动画 hook：组件挂载时淡入 + 上移。
 * 用法：
 *   const scope = useEnterAnimation();           // 整体淡入
 *   const scope = useEnterAnimation({ stagger: 0.08 });  // 子元素错峰（子元素加 data-anim）
 *   return <div ref={scope}>...</div>
 */
export function useEnterAnimation(options: EnterOptions = {}) {
  const scope = useRef<HTMLDivElement>(null);
  const { y = 16, stagger, delay = 0 } = options;

  useGSAP(
    () => {
      if (stagger) {
        // 错峰：scope 内带 data-anim 的元素依次入场
        gsap.from('[data-anim]', {
          opacity: 0,
          y,
          duration: DURATION,
          ease: EASE,
          stagger,
          delay,
        });
      } else {
        // 整体淡入
        gsap.from(scope.current, {
          opacity: 0,
          y,
          duration: DURATION,
          ease: EASE,
          delay,
        });
      }
    },
    { scope },
  );

  return scope;
}
