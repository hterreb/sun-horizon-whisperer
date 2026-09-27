
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
					coral: 'hsl(var(--brand-coral))'
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
					horizon: {
						night: 'hsl(var(--scene-horizon-night))',
						'astro-twilight': 'hsl(var(--scene-horizon-astro-twilight))',
						'nautical-twilight': 'hsl(var(--scene-horizon-nautical-twilight))',
						dawn: 'hsl(var(--scene-horizon-dawn))',
						day: 'hsl(var(--scene-horizon-day))'
					},
					water: 'hsl(var(--scene-water))'
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
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'sun-rise': 'sun-rise 3s ease-out',
				'sun-set': 'sun-set 3s ease-out',
				'glow': 'glow 5s ease-in-out infinite'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
