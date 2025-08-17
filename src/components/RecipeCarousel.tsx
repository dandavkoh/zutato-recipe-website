'use client'

import React from 'react'
import Link from 'next/link'
import RecipeRatingSummary from '@/components/RecipeRatingSummary'

type RecipeItem = {
	id: string
	name: string
	description?: string | null
	difficulty: 'einfach' | 'mittel' | 'schwer'
	working_time_minutes: number | null
	cooking_time_minutes: number | null
	resting_time_minutes: number | null
	image_url: string | null
}

type RatingMap = Record<string, { avg: number; count: number }>

type RecipeCarouselProps = {
	recipes: RecipeItem[]
	ratingById: RatingMap
	loop?: boolean
	autoplay?: boolean
	autoplayIntervalMs?: number
	showDots?: boolean
	showArrows?: boolean
	peekFraction?: number
}

function getTotalMinutes(r: RecipeItem): number | null {
	const w = r.working_time_minutes ?? 0
	const c = r.cooking_time_minutes ?? 0
	const rest = r.resting_time_minutes ?? 0
	const sum = w + c + rest
	return sum > 0 ? sum : null
}

function toSlug(s: string) {
	return s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
}

export default function RecipeCarousel({
	recipes,
	ratingById,
	loop = true,
	autoplay = true,
	autoplayIntervalMs = 5000,
	showDots = true,
	showArrows = true,
	peekFraction = 0.1,
}: RecipeCarouselProps) {
	const wrapperRef = React.useRef<HTMLDivElement | null>(null)
	const trackRef = React.useRef<HTMLDivElement | null>(null)
	const [wrapperWidth, setWrapperWidth] = React.useState(0)
	const [isAnimating, setIsAnimating] = React.useState(false)

	const hasMultiple = recipes.length > 1
	const useLoop = loop && hasMultiple
	const slides = useLoop ? [recipes[recipes.length - 1], ...recipes, recipes[0]] : recipes
	const realCount = recipes.length
	const [currentIndex, setCurrentIndex] = React.useState(useLoop ? 1 : 0)

	const gapPx = 24
	const clampedPeek = Math.max(0, Math.min(0.45, peekFraction))
	const peekPx = Math.round(wrapperWidth * clampedPeek)
	const slideWidth = Math.max(200, wrapperWidth - 2 * peekPx)

	const displayIndex = useLoop ? (currentIndex - 1 + realCount) % realCount : currentIndex

	React.useEffect(() => {
		if (!wrapperRef.current) return
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const cr = entry.contentRect
				setWrapperWidth(Math.round(cr.width))
			}
		})
		ro.observe(wrapperRef.current)
		return () => ro.disconnect()
	}, [])

	React.useEffect(() => {
		if (!autoplay || !hasMultiple) return
		const id = window.setInterval(() => {
			goTo(currentIndex + 1)
		}, Math.max(1500, autoplayIntervalMs))
		return () => window.clearInterval(id)
	}, [autoplay, autoplayIntervalMs, hasMultiple, currentIndex])

	const goTo = (target: number) => {
		if (!hasMultiple) return
		setIsAnimating(true)
		setCurrentIndex(target)
	}

	const goToDisplayIndex = (idx: number) => {
		if (!hasMultiple) return
		const target = useLoop ? idx + 1 : idx
		goTo(target)
	}

	const handleTransitionEnd = () => {
		if (!useLoop) {
			setIsAnimating(false)
			return
		}
		const lastIndex = slides.length - 1
		if (currentIndex === 0) {
			setIsAnimating(false)
			setCurrentIndex(lastIndex - 1)
			return
		}
		if (currentIndex === lastIndex) {
			setIsAnimating(false)
			setCurrentIndex(1)
			return
		}
		setIsAnimating(false)
	}

	const totalOffset = (idx: number) => {
		const offsetForIndex = idx * (slideWidth + gapPx)
		return Math.round(peekPx - offsetForIndex)
	}

	if (recipes.length === 0) {
		return <div className="text-center text-gray-600">Diese Woche noch keine Rezepte.</div>
	}

	return (
		<div className="relative" ref={wrapperRef}>
			<div
				ref={trackRef}
				className="flex items-stretch"
				style={{
					gap: `${gapPx}px`,
					transform: `translateX(${totalOffset(currentIndex)}px)`,
					transition: isAnimating ? 'transform 400ms ease' : 'none',
				}}
				onTransitionEnd={handleTransitionEnd}
			>
				{slides.map((recipe, idx) => {
					const totalMinutes = getTotalMinutes(recipe)
					const timeText = totalMinutes ? `${totalMinutes} Min` : '–'
					const rating = ratingById[recipe.id]
					return (
						<div
							key={`${recipe.id}-${idx}`}
							className="shrink-0 bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
							style={{ width: `${slideWidth}px` }}
						>
							<div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-6xl">
								{recipe.image_url ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img src={recipe.image_url} alt={recipe.name} className="h-full w-full object-cover" />
								) : (
									'🍽️'
								)}
							</div>
							<div className="p-6">
								<h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2">{recipe.name}</h3>
								<div className="flex items-center justify-between text-sm text-gray-500 mb-4">
									<span>⏱️ {timeText}</span>
									<span>📊 {recipe.difficulty.charAt(0).toUpperCase() + recipe.difficulty.slice(1)}</span>
									<span>
										<RecipeRatingSummary average={rating?.avg ?? null} count={rating?.count ?? 0} />
									</span>
								</div>
								<Link
									href={`/rezepte/${recipe.id}/${toSlug(recipe.name)}`}
									className="block w-full bg-orange-600 hover:bg-orange-700 text-white text-center py-2 rounded-lg font-medium transition-colors"
								>
									Rezept anzeigen
								</Link>
							</div>
						</div>
					)
				})}
			</div>

			{showArrows && hasMultiple && (
				<>
					<button
						type="button"
						onClick={() => goTo(currentIndex - 1)}
						className="hidden md:flex items-center justify-center absolute -left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow border hover:bg-gray-50"
						aria-label="Zurück"
					>
						‹
					</button>
					<button
						type="button"
						onClick={() => goTo(currentIndex + 1)}
						className="hidden md:flex items-center justify-center absolute -right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow border hover:bg-gray-50"
						aria-label="Weiter"
					>
						›
					</button>
				</>
			)}

			{showDots && hasMultiple && (
				<div className="mt-6 flex items-center justify-center gap-2">
					{Array.from({ length: realCount }).map((_, idx) => (
						<button
							key={idx}
							type="button"
							onClick={() => goToDisplayIndex(idx)}
							className={`h-2.5 w-2.5 rounded-full transition-all ${
								displayIndex === idx ? 'bg-orange-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
							}`}
							aria-label={`Gehe zu Element ${idx + 1}`}
						/>
					))}
				</div>
			)}
		</div>
	)
}

