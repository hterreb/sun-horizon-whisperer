import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { GLASS_SURFACE } from '@/utils/glassChrome';
import { FOCUS_RING } from './InfoPanel';
import PlaceSearch from './PlaceSearch';
import PremiumBadge from './PremiumBadge';
import { useLanguage } from '@/hooks/useLanguage';

// A location that arrives sooner than this skips the rise: SunTracker fades the scene
// in instead, and the rise animation waits this long before it starts
// (tailwind.config.ts `mark-rise`).
export const FAST_START_MS = 400;
// After this long with no location, the prompt is probably still open.
const WAITING_MS = 3000;

// "Sun Chaser" in Shrikhand, as outlined glyph paths (from store/wordmark-sun-chaser.svg),
// so no web font loads: [x offset, path] per glyph, in font units.
const WORDMARK_GLYPHS: [number, string][] = [
  [0, 'M574 616 597 635Q621 654 636.5 661.0Q652 668 672 668Q696 668 710.0 657.5Q724 647 724 627Q724 619 721 610L679 472Q672 448 661.5 438.0Q651 428 630 428Q608 428 591.5 441.5Q575 455 540 497Q505 537 476.5 553.5Q448 570 418 570Q396 570 381.0 555.5Q366 541 366 520Q366 496 390.0 475.5Q414 455 465 424Q517 393 551.0 368.0Q585 343 609.0 306.0Q633 269 633 221Q633 190 623 159Q599 79 530.0 37.5Q461 -4 369 -4Q300 -4 253.0 12.0Q206 28 157 66L121 36Q96 15 80.0 7.5Q64 0 44 0Q21 0 7.5 11.0Q-6 22 -6 41Q-6 51 -2 62L47 211Q55 237 69.0 248.0Q83 259 105 259Q128 259 146.5 243.0Q165 227 195 185Q227 139 254.5 121.0Q282 103 320 103Q347 103 361.5 111.5Q376 120 382 139Q384 144 384 154Q384 178 361.0 198.0Q338 218 290 246Q239 277 207.0 301.5Q175 326 151.5 363.0Q128 400 128 450Q128 485 139 519Q160 588 225.0 630.0Q290 672 374 672Q430 672 477.5 658.5Q525 645 574 616Z'],
  [689, 'M594 138Q592 130 592 126Q592 119 595.5 115.0Q599 111 605 111Q617 111 625.5 121.5Q634 132 637 132Q642 132 645.5 125.5Q649 119 649 110Q650 82 629.0 54.5Q608 27 570.0 9.0Q532 -9 485 -9Q426 -9 391.0 15.0Q356 39 346 78Q310 38 266.5 17.5Q223 -3 178 -3Q108 -3 60.5 31.5Q13 66 13 128Q13 156 23 186L87 395Q90 404 90 410Q90 421 85.0 427.5Q80 434 70 441Q60 449 56.0 455.0Q52 461 55 471Q61 494 118.0 511.5Q175 529 237 529Q295 529 322.0 507.0Q349 485 349 447Q349 424 342 403L279 195Q275 184 275 174Q275 160 283.0 153.0Q291 146 304 146Q323 146 335.0 157.0Q347 168 359 194L420 395Q423 404 423 410Q423 421 418.0 427.5Q413 434 404 441Q394 449 390.0 455.0Q386 461 389 471Q394 494 451.0 511.5Q508 529 570 529Q628 529 655.5 507.0Q683 485 683 448Q683 429 675 403Z'],
  [1375, 'M619 138Q617 134 617 126Q617 119 620.5 115.0Q624 111 630 111Q642 111 650.5 121.5Q659 132 662 132Q667 132 670.0 125.5Q673 119 673 110Q674 81 654.0 53.5Q634 26 595.5 8.5Q557 -9 503 -9Q437 -9 398.0 21.5Q359 52 358 103Q358 140 376 186L431 330Q436 343 436 351Q436 364 427.5 371.5Q419 379 407 379Q385 379 365.0 358.5Q345 338 336 308L274 104Q270 93 270 83Q270 71 275.0 63.5Q280 56 289 48Q296 42 299.0 37.0Q302 32 300 25Q296 12 281.0 6.0Q266 0 234 0H6Q-20 0 -31.5 8.5Q-43 17 -40 31Q-36 43 -19 52Q-4 60 6.0 71.0Q16 82 23 106L112 395Q114 400 114 409Q114 420 109.5 426.0Q105 432 95 441Q85 449 81.0 455.0Q77 461 80 471Q86 494 143.0 511.5Q200 529 262 529Q312 529 341.0 501.5Q370 474 367 425Q408 484 454.0 506.5Q500 529 554 529Q615 529 652.5 492.0Q690 455 690 396Q690 365 680 335Z'],
  [2291, 'M51 263Q51 323 72 393Q118 543 211.0 609.5Q304 676 410 676Q467 676 511.0 659.0Q555 642 592 610L619 631Q646 652 664.5 660.0Q683 668 706 668Q731 668 746.0 657.0Q761 646 761 625Q761 614 757 603L701 447Q692 420 679.5 409.0Q667 398 642 398Q616 398 599.5 416.5Q583 435 562 480Q538 527 523.0 542.0Q508 557 479 557Q438 557 400.0 506.5Q362 456 331 355Q305 270 305 213Q305 163 324.0 138.5Q343 114 375 114Q422 114 452.5 135.0Q483 156 515 192Q535 214 547.5 224.5Q560 235 574 235Q592 235 612.0 217.0Q632 199 631 181Q632 159 595.5 113.0Q559 67 494.5 30.5Q430 -6 348 -6Q264 -6 197.0 25.0Q130 56 90.5 116.5Q51 177 51 263Z'],
  [2983, 'M613 138Q611 134 611 126Q611 119 614.5 115.0Q618 111 624 111Q636 111 644.5 121.5Q653 132 656 132Q661 132 664.0 125.5Q667 119 667 110Q668 81 648.0 53.5Q628 26 589.5 8.5Q551 -9 497 -9Q431 -9 392.0 21.5Q353 52 352 103Q352 140 370 186L425 330Q430 343 430 351Q430 364 421.5 371.5Q413 379 401 379Q382 379 362.5 361.5Q343 344 331 305V307L268 104Q265 92 265 83Q265 70 270.0 62.5Q275 55 284 48Q291 41 294.0 36.5Q297 32 295 25Q290 12 275.0 6.0Q260 0 229 0H1Q-25 0 -37.0 8.5Q-49 17 -45 31Q-41 43 -24 52Q-9 60 1.0 71.0Q11 82 18 106L170 605Q173 614 173 620Q173 631 167.5 638.0Q162 645 153 652Q143 660 138.5 666.0Q134 672 137 682Q143 705 200.0 722.0Q257 739 319 739Q377 739 404.5 717.0Q432 695 432 657Q432 635 425 614L371 438Q410 489 453.5 509.0Q497 529 548 529Q609 529 646.5 492.0Q684 455 684 396Q684 365 674 335Z'],
  [3693, 'M610 357Q610 324 598 282L557 144Q556 140 556 134Q556 118 569 118Q581 118 589.5 128.5Q598 139 601 139Q606 139 609.5 132.0Q613 125 613 116Q614 89 592.5 61.0Q571 33 535.0 15.0Q499 -3 456 -3Q404 -3 367.0 16.0Q330 35 316 72Q286 36 245.0 16.5Q204 -3 157 -3Q104 -3 68.0 17.5Q32 38 14.5 70.5Q-3 103 -3 139Q-3 155 0 170Q16 239 69.5 274.0Q123 309 197 309Q280 309 360 283L385 349Q398 391 398 414Q397 438 382.0 450.0Q367 462 336 462Q342 446 342 429Q342 392 314.0 365.0Q286 338 234 338Q185 338 157.5 359.5Q130 381 130 413Q130 463 186.0 496.0Q242 529 357 529Q472 529 541.0 486.5Q610 444 610 357ZM238 158Q238 142 245.5 132.0Q253 122 267 122Q280 122 295.5 132.5Q311 143 318 164L339 223Q322 226 301 226Q273 226 255.5 204.5Q238 183 238 158Z'],
  [4347, 'M598 420Q598 385 570.5 363.0Q543 341 494 341Q444 341 409.5 366.0Q375 391 375 429Q375 442 379 454Q361 459 347 459Q322 459 305.5 447.0Q289 435 290 413Q290 387 316.0 369.0Q342 351 400 324Q450 302 482.5 283.5Q515 265 537.5 237.0Q560 209 560 171Q560 163 556 141Q540 74 467.0 35.0Q394 -4 275 -4Q141 -4 62.5 32.0Q-16 68 -16 131Q-16 174 10.0 196.0Q36 218 79 218Q129 218 164.5 187.0Q200 156 200 108Q200 95 197 81Q221 75 243 75Q269 75 286.0 89.0Q303 103 303 128Q302 151 280.0 167.5Q258 184 210 207Q165 228 136.0 246.5Q107 265 86.5 293.0Q66 321 66 359Q66 441 134.5 489.5Q203 538 329 538Q412 538 472.5 523.0Q533 508 565.5 481.0Q598 454 598 420Z'],
  [4940, 'M580 390Q580 371 576 355Q561 289 492.5 260.5Q424 232 331 232Q284 232 243 238Q242 186 271.0 165.0Q300 144 352 144Q376 144 398.0 149.5Q420 155 454 166Q482 176 492 176Q503 176 503 163Q504 128 477.0 89.5Q450 51 397.0 24.0Q344 -3 269 -3Q158 -3 87.0 53.0Q16 109 16 216Q16 246 24 286Q49 409 133.5 471.5Q218 534 339 534Q466 534 523.0 493.5Q580 453 580 390ZM261 297Q303 297 325.0 336.0Q347 375 346 423Q345 451 330 451Q319 451 304.0 433.5Q289 416 274.5 381.0Q260 346 250 298Q254 297 261 297Z'],
  [5500, 'M614 411Q614 392 610 376Q600 335 572.0 313.0Q544 291 505 291Q467 291 447.5 309.0Q428 327 413 357Q405 374 398.0 382.0Q391 390 382 390Q372 390 364.5 382.0Q357 374 351 354L274 104Q272 99 272 89Q272 76 279.5 67.5Q287 59 300 51Q312 43 316.0 38.0Q320 33 319 25Q317 12 304.5 6.0Q292 0 262 0H6Q-20 0 -31.5 8.5Q-43 17 -40 31Q-36 43 -19 52Q-4 60 6.0 71.0Q16 82 23 106L112 395Q114 400 114 409Q114 420 109.5 426.0Q105 432 95 441Q85 449 81.0 455.0Q77 461 80 471Q86 494 143.0 511.5Q200 529 262 529Q303 529 330.0 510.5Q357 492 365 458Q413 529 491 529Q547 529 580.5 495.0Q614 461 614 411Z'],
];

const fill = (token: string) => ({ fill: `hsl(var(--${token}))` });

interface LoadingScreenProps {
  // Reduced motion, or the reveal has started: the mark rests in its logo pose.
  still: boolean;
  onSelectPlace: (latitude: number, longitude: number, name: string) => void;
}

// Loading screen "Rising Mark" (ROADMAP item 39): the app mark on Night (the manifest
// background_color, so the Android splash runs straight into it). Its sun rises once
// out of the water; after WAITING_MS it sinks to half-risen and offers
// "Choose a place". SunTracker renders it under the scene and removes it after the
// hand-off.
const LoadingScreen: React.FC<LoadingScreenProps> = ({ still, onSelectPlace }) => {
  const [isWaiting, setIsWaiting] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const timeoutId = setTimeout(() => setIsWaiting(true), WAITING_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  const sunMotion = still ? '' : isWaiting ? 'animate-mark-sink' : 'animate-mark-rise';
  const glintMotion = still ? '' : isWaiting ? 'animate-mark-glint-out' : 'animate-mark-glint';

  return (
    <div className="fixed inset-0 bg-brand-night text-white" data-testid="loading-screen">
      <div
        className="absolute inset-x-0 flex flex-col items-center gap-[18px] px-4"
        style={{ top: 'calc(36% - 68px)' }}
      >
        {/* public/logo-mark.svg, drawn from tokens, with a soft peach rim for Night */}
        <svg viewBox="0 0 120 120" width={136} height={136} aria-hidden="true">
          <defs>
            <clipPath id="loading-mark-clip"><circle cx="60" cy="60" r="58" /></clipPath>
            <linearGradient id="loading-mark-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'hsl(var(--brand-mark-dusk))' }} />
              <stop offset=".55" style={{ stopColor: 'hsl(var(--brand-sunset))' }} />
              <stop offset="1" style={{ stopColor: 'hsl(var(--brand-peach))' }} />
            </linearGradient>
            <clipPath id="loading-mark-sun"><circle cx="60" cy="66" r="24" /></clipPath>
          </defs>
          <g clipPath="url(#loading-mark-clip)">
            <rect width="120" height="84" fill="url(#loading-mark-sky)" />
            <g className={sunMotion} data-testid="loading-mark-sun">
              <circle cx="60" cy="66" r="24" style={fill('brand-mark-sun')} />
              <g clipPath="url(#loading-mark-sun)">
                <rect x="30" y="70" width="60" height="3" style={fill('brand-sunset')} />
                <rect x="30" y="77" width="60" height="4" style={fill('brand-sunset')} />
              </g>
            </g>
            <rect y="84" width="120" height="36" style={fill('brand-sky')} />
            <g className={glintMotion}>
              <rect x="44" y="92" width="32" height="3" rx="1.5" style={fill('brand-mark-sun')} />
              <rect x="50" y="100" width="20" height="3" rx="1.5" style={fill('brand-mark-sun')} opacity=".7" />
            </g>
          </g>
          <circle cx="60" cy="60" r="58" fill="none" strokeWidth="2" style={{ stroke: 'hsl(var(--brand-peach) / 0.35)' }} />
        </svg>

        <svg
          viewBox="-1 -85 705 87"
          width={211}
          height={26}
          role="img"
          aria-label="Sun Chaser"
          className="mt-1 text-brand-peach"
          fill="currentColor"
        >
          <g transform="scale(0.115 -0.115)">
            {WORDMARK_GLYPHS.map(([x, d]) => <path key={x} transform={`translate(${x} 0)`} d={d} />)}
          </g>
        </svg>

        <p role="status" className="text-body text-white/75">
          {isWaiting ? t('loading.waiting') : t('loading.locating')}
        </p>

        {isWaiting && (isSearchOpen ? (
          <div className={`${GLASS_SURFACE} rounded-panel w-full max-w-[300px] p-3 text-caption`}>
            <PlaceSearch onSelect={onSelectPlace} autoFocus />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className={`${GLASS_SURFACE} rounded-full inline-flex items-center gap-2 px-4 py-2 text-body font-semibold ${FOCUS_RING}`}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {t('loading.choosePlace')}
            <PremiumBadge />
          </button>
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;
