import { useRef } from "react";
import { characterDetails } from "../content/siteContent";
import { characterMedia } from "../content/mediaCatalog";
import { gsap, useGSAP } from "../animation/gsap";
import { ChapterHud } from "../components/ChapterHud";

export function CharacterSection({ reducedMotion }: { reducedMotion: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (reducedMotion) return;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const scenes = gsap.utils.toArray<HTMLElement>(".character-scene");
    const portraits = mobile
      ? [
          { x: -35, y: 11, scale: 0.74, rotate: -1.2 },
          { x: -42, y: 12, scale: 0.7, rotate: 0.7 },
          { x: -37, y: 10, scale: 0.76, rotate: -0.8 },
          { x: -44, y: 13, scale: 0.7, rotate: 0.9 },
        ]
      : [
          { x: -2, y: 0, scale: 1.02, rotate: -0.7 },
          { x: -7, y: 1, scale: 1.08, rotate: 0.5 },
          { x: -11, y: -1, scale: 1.13, rotate: -0.4 },
          { x: -15, y: -3, scale: 1.18, rotate: 0.6 },
        ];

    gsap.set(scenes, { autoAlpha: 0, clipPath: "inset(100% 0 0 0)" });
    const entrance = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top bottom",
        end: "top top",
        scrub: 0.45,
      },
    });

    entrance
      .fromTo(".character-stage-title", { yPercent: 28, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out" })
      .fromTo(".character-portrait", { yPercent: 12, scale: 0.9, autoAlpha: 0 }, { yPercent: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: "power3.out" }, 0)
      .fromTo(".character-halo", { scale: 0.72, rotate: -12, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1 }, 0);

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.45,
      },
    });

    timeline.to(".character-stage-title", { yPercent: -36, autoAlpha: mobile ? 0.06 : 0.22, scale: 0.82, duration: 0.8 });

    scenes.forEach((scene, index) => {
      const pose = portraits[index];
      timeline
        .set(scene, { autoAlpha: 1 })
        .to(scene, { clipPath: "inset(0% 0 0 0)", duration: 0.58, ease: "power2.inOut" })
        .to(".character-portrait", { xPercent: pose.x, yPercent: pose.y, scale: pose.scale, rotate: pose.rotate, autoAlpha: mobile ? 0.3 : 1, duration: 0.75, ease: "power2.inOut" }, "<")
        .fromTo(scene.querySelector("img"), { scale: 1.14 }, { scale: 1, duration: 0.85, ease: "power2.out" }, "<")
        .set(index > 0 ? scenes[index - 1] : [], { autoAlpha: 0 })
        .to(scene, { autoAlpha: 1, duration: 0.58 });
    });

    gsap.fromTo(".chapter-progress-fill", { scaleX: 0 }, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom bottom", scrub: true },
    });
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  return (
    <section ref={sectionRef} className="character-chapter chapter" id="character">
      <div className="character-stage">
        <ChapterHud index="01" label="CHARACTER / DESIGN LANGUAGE" />
        <div className="chapter-grid-field" aria-hidden="true" />
        <div className="character-halo" aria-hidden="true"><span /><i /></div>

        <header className="character-stage-title">
          <small>RECOGNITION BEFORE EXPLANATION</small>
          <h2>不是装饰的集合，<br />是夜希的<span>完整轮廓</span>。</h2>
          <p>继续向下。镜头会逐一锁定她最容易被记住的四个特征。</p>
        </header>

        <figure className="character-portrait">
          <img src={characterMedia.full} alt="夜希自然比例3D全身形象" />
          <figcaption><b>NYXIE</b><span>MODEL 025 / DREAM NAVIGATOR</span></figcaption>
        </figure>

        <div className="character-scenes">
          {characterDetails.map((detail) => (
            <article className="character-scene" key={detail.id}>
              <div className="character-scene-image"><img src={detail.image} alt={detail.imageAlt} /></div>
              <div className="character-scene-copy">
                <div className="scene-index">{detail.index}</div>
                <small>{detail.eyebrow}</small>
                <h3>{detail.title}</h3>
                <p>{detail.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="character-reticle" aria-hidden="true"><span>IDENTITY LOCK</span><i /></div>
      </div>
    </section>
  );
}
