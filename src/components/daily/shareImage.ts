/**
 * Turns the share card's SVG into a PNG. The card is drawn onto a canvas as an image; Ponku is
 * drawn on top separately, because an SVG loaded as an image may not load pictures inside it.
 * Everything is same-origin, so the canvas can always be saved.
 */
import { MASCOT_ART, type MascotPose } from '../mascotArt';
import { CARD, type ShareCardLayout } from './shareCardLayout';

export interface MascotPlacement {
  pose: MascotPose;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where Ponku goes on the card, keeping the pose's proportions. */
export function mascotPlacement(
  pose: MascotPose,
  corner: ShareCardLayout['mascot'],
): MascotPlacement {
  const art = MASCOT_ART[pose];
  const width = Math.round((corner.height * art.width) / art.height);
  return {
    pose,
    src: art.src,
    x: corner.right - width,
    y: corner.bottom - corner.height,
    width,
    height: corner.height,
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The image did not load'));
    image.src = src;
  });
}

/** The card as a PNG, at its full 1080 × 1350 size. */
export async function renderShareImage(svg: SVGSVGElement): Promise<Blob> {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const placeholder = copy.querySelector<SVGImageElement>('[data-share-mascot]');
  const mascot = placeholder && {
    src: placeholder.getAttribute('href') ?? '',
    x: Number(placeholder.getAttribute('x')),
    y: Number(placeholder.getAttribute('y')),
    width: Number(placeholder.getAttribute('width')),
    height: Number(placeholder.getAttribute('height')),
  };
  placeholder?.remove();
  copy.removeAttribute('class');
  const markup = new XMLSerializer().serializeToString(copy);

  const canvas = document.createElement('canvas');
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot draw images');
  const card = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);
  context.drawImage(card, 0, 0, CARD.width, CARD.height);
  if (mascot?.src) {
    const art = await loadImage(mascot.src);
    context.drawImage(art, mascot.x, mascot.y, mascot.width, mascot.height);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be saved'))),
      'image/png',
    );
  });
}
