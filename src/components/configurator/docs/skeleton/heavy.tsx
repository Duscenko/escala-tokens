/**
 * Specimens whose components pull a large library (react-day-picker,
 * Recharts, Embla). `specimens.tsx` loads this module lazily, so none of it
 * lands in the bundle until one of these pages is opened.
 */
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Bar, BarChart, Line, LineChart, Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import type { SpecimenProps } from '../specimens'
import { PreviewIcon } from '../specimens'
import { iconOf } from '../../../../lib/previewTokens'
import { chartPalette } from '../../../../lib/chartPalette'
import { Calendar as SkCalendar } from '../../../escala-ui/calendar'
import { ChartContainer as SkChartContainer, ChartLegend as SkChartLegend, ChartLegendContent as SkChartLegendContent, ChartTooltip as SkChartTooltip, ChartTooltipContent as SkChartTooltipContent, type ChartConfig } from '../../../escala-ui/chart'
import { Carousel as SkCarousel, CarouselContent as SkCarouselContent, CarouselItem as SkCarouselItem, CarouselNext as SkCarouselNext, CarouselPrevious as SkCarouselPrevious } from '../../../escala-ui/carousel'
import { Card as SkCard, CardContent as SkCardContent } from '../../../escala-ui/card'
import { RecipeScope } from './scope'

const MONTH = new Date(2026, 9, 1)

export function SkeletonCalendarSpecimen({ t, v }: SpecimenProps) {
  const [day, setDay] = useState<Date | undefined>(new Date(2026, 9, 14))
  const [range, setRange] = useState<DateRange | undefined>({ from: new Date(2026, 9, 12), to: new Date(2026, 9, 17) })
  const icons = {
    prevIcon: <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}><PreviewIcon concept="chevron" size={iconOf(13)} /></span>,
    nextIcon: <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}><PreviewIcon concept="chevron" size={iconOf(13)} /></span>,
  }
  return (
    <RecipeScope t={t}>
      {v.Mode === 'range'
        ? <SkCalendar mode="range" defaultMonth={MONTH} selected={range} onSelect={setRange} {...icons} />
        : <SkCalendar mode="single" defaultMonth={MONTH} selected={day} onSelect={setDay} {...icons} />}
    </RecipeScope>
  )
}

const CHART_DATA = [
  { month: 'May', desktop: 186, mobile: 80 },
  { month: 'Jun', desktop: 305, mobile: 200 },
  { month: 'Jul', desktop: 237, mobile: 120 },
  { month: 'Aug', desktop: 273, mobile: 190 },
  { month: 'Sep', desktop: 209, mobile: 130 },
  { month: 'Oct', desktop: 264, mobile: 140 },
]

export function SkeletonChartSpecimen({ t, v }: SpecimenProps) {
  const [a, b] = chartPalette(t.brandSolid)
  const config: ChartConfig = { desktop: { label: 'Desktop', color: a }, mobile: { label: 'Mobile', color: b } }
  const type = v.Type ?? 'bar'
  const common = { accessibilityLayer: true, data: CHART_DATA }
  const axis = <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
  const grid = <CartesianGrid vertical={false} />
  const tip = <SkChartTooltip content={<SkChartTooltipContent />} />
  const legend = <SkChartLegend content={<SkChartLegendContent />} />
  return (
    <RecipeScope t={t}>
      <SkChartContainer config={config} style={{ width: 380 }}>
        {type === 'line' ? (
          <LineChart {...common}>{grid}{axis}{tip}{legend}
            <Line dataKey="desktop" type="monotone" stroke="var(--color-desktop)" strokeWidth={2} dot={false} />
            <Line dataKey="mobile" type="monotone" stroke="var(--color-mobile)" strokeWidth={2} dot={false} />
          </LineChart>
        ) : type === 'area' ? (
          <AreaChart {...common}>{grid}{axis}{tip}{legend}
            <Area dataKey="mobile" type="natural" fill="var(--color-mobile)" fillOpacity={0.4} stroke="var(--color-mobile)" stackId="a" />
            <Area dataKey="desktop" type="natural" fill="var(--color-desktop)" fillOpacity={0.4} stroke="var(--color-desktop)" stackId="a" />
          </AreaChart>
        ) : (
          <BarChart {...common}>{grid}{axis}{tip}{legend}
            <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
            <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
          </BarChart>
        )}
      </SkChartContainer>
    </RecipeScope>
  )
}

export function SkeletonCarouselSpecimen({ t, v }: SpecimenProps) {
  const vertical = v.Orientation === 'vertical'
  const prev = <span style={{ display: 'inline-flex', transform: 'rotate(90deg)' }}><PreviewIcon concept="chevron" size={iconOf(13)} /></span>
  const next = <span style={{ display: 'inline-flex', transform: 'rotate(-90deg)' }}><PreviewIcon concept="chevron" size={iconOf(13)} /></span>
  return (
    <RecipeScope t={t}>
      <div style={{ padding: vertical ? '48px 0' : '0 48px' }}>
        <SkCarousel orientation={vertical ? 'vertical' : 'horizontal'} style={{ width: 200 }}>
          <SkCarouselContent style={vertical ? { height: 200 } : undefined}>
            {[1, 2, 3, 4, 5].map((n) => (
              <SkCarouselItem key={n}>
                <SkCard style={{ width: '100%' }}>
                  <SkCardContent>
                    <div className="flex aspect-square items-center justify-center" style={{ fontSize: 32, fontWeight: 600 }}>{n}</div>
                  </SkCardContent>
                </SkCard>
              </SkCarouselItem>
            ))}
          </SkCarouselContent>
          <SkCarouselPrevious icon={prev} />
          <SkCarouselNext icon={next} />
        </SkCarousel>
      </div>
    </RecipeScope>
  )
}
