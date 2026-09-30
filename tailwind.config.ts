
import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Custom colors for sun app
				dawn: '#FEC6A1',
				sunrise: '#F97316',
				day: '#0EA5E9',
				sunset: '#ea384c',
				dusk: '#E5DEFF',
				night: '#1A1F2C',
				twilight: {
					civil: '#403E43',
					nautical: '#221F26',
					astronomical: '#0F0E11'
				},
				// Direction D "Polished Classic" tokens (ROADMAP item 7)
				brand: {
					sunset: 'hsl(var(--brand-sunset))',
					peach: 'hsl(var(--brand-peach))',
					sky: 'hsl(var(--brand-sky))',
					cyan: 'hsl(var(--brand-cyan))',
					night: 'hsl(var(--brand-night))',
					coral: 'hsl(var(--brand-coral))',
					gold: 'hsl(var(--brand-gold))',
					'gold-light': 'hsl(var(--brand-gold-light))'
				},
				scene: {
					sky: {
						'night-1': 'hsl(var(--scene-sky-night-1))',
						'night-2': 'hsl(var(--scene-sky-night-2))',
						'night-3': 'hsl(var(--scene-sky-night-3))',
						'dawn-1': 'hsl(var(--scene-sky-dawn-1))',
						'dawn-2': 'hsl(var(--scene-sky-dawn-2))',
						'dawn-3': 'hsl(var(--scene-sky-dawn-3))',
						'day-1': 'hsl(var(--scene-sky-day-1))',
						'day-2': 'hsl(var(--scene-sky-day-2))',
						'day-3': 'hsl(var(--scene-sky-day-3))',
						'dusk-1': 'hsl(var(--scene-sky-dusk-1))',
						'dusk-2': 'hsl(var(--scene-sky-dusk-2))',
						'dusk-3': 'hsl(var(--scene-sky-dusk-3))'
					},
					sunGlow: {
						high: 'hsl(var(--scene-sun-glow-high))',
						low: 'hsl(var(--scene-sun-glow-low))',
						horizon: 'hsl(var(--scene-sun-glow-horizon))'
					},
					moon: 'hsl(var(--scene-moon))',
					moonDark: 'hsl(var(--scene-moon-dark))',
					water: 'hsl(var(--scene-water))',
					ridge: {
						night: 'hsl(var(--scene-ridge-night))',
						day: 'hsl(var(--scene-ridge-day))',
						golden: 'hsl(var(--scene-ridge-golden))'
					},
					glowWhite: 'hsl(var(--scene-glow-white))',
					ghostHalo: 'hsl(var(--scene-ghost-halo))',
					iceberg: {
						fill: 'hsl(var(--scene-iceberg-fill))',
						shade: 'hsl(var(--scene-iceberg-shade))',
						glow: 'hsl(var(--scene-iceberg-glow))'
					},
					critter: 'hsl(var(--scene-critter-silhouette))'
				},
				panel: {
					background: 'hsl(var(--panel-background))',
					border: 'hsl(var(--panel-border))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				panel: 'var(--panel-radius)'
			},
			fontSize: {
				caption: ['12px', { lineHeight: '16px' }],
				body: ['14px', { lineHeight: '20px' }],
				title: ['17px', { lineHeight: '24px' }],
				display: ['28px', { lineHeight: '34px' }],
				hero: ['34px', { lineHeight: '40px' }]
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'sun-rise': {
					'0%': { transform: 'translateY(100%)' },
					'100%': { transform: 'translateY(0)' }
				},
				'sun-set': {
					'0%': { transform: 'translateY(0)' },
					'100%': { transform: 'translateY(100%)' }
				},
				'glow': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.8' }
				},
				// Slow water glitter under the sun or the moon (ROADMAP item 53).
				'shimmer': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.35' }
				},
				'fade-in': {
					from: { opacity: '0' },
					to: { opacity: '1' }
				},
				'fade-out': {
					from: { opacity: '1' },
					to: { opacity: '0' }
				},
				// Loading screen (ROADMAP item 39). The mark's sun moves in SVG user units
				// (viewBox 0 0 120 120): 44 puts it fully under the water line at y 84,
				// 18 is half-risen.
				'mark-rise': {
					from: { transform: 'translateY(44px)' },
					to: { transform: 'translateY(0)' }
				},
				'mark-sink': {
					from: { transform: 'translateY(0)' },
					to: { transform: 'translateY(18px)' }
				},
				// The scene opens from the 136 px mark, centred at 36 % of the height.
				'scene-iris': {
					from: { clipPath: 'circle(68px at 50% 36%)' },
					to: { clipPath: 'circle(150vmax at 50% 36%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'sun-rise': 'sun-rise 3s ease-out',
				'sun-set': 'sun-set 3s ease-out',
				'glow': 'glow 5s ease-in-out infinite',
				'shimmer': 'shimmer 5s ease-in-out infinite',
				'fade-in': 'fade-in 0.5s ease-out',
				// The rise waits 0.4 s, so a location that arrives sooner never shows it.
				'mark-rise': 'mark-rise 2.6s cubic-bezier(0.22, 0.8, 0.3, 1) 0.4s both',
				'mark-sink': 'mark-sink 1s ease-in-out both',
				'mark-glint': 'fade-in 1s ease-out 1.7s both',
				'mark-glint-out': 'fade-out 1s ease-in-out both',
				'scene-iris': 'scene-iris 1s cubic-bezier(0.65, 0, 0.25, 1) both',
				'scene-fade': 'fade-in 0.2s ease-out both'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
