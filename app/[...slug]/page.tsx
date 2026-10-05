import { notFound } from 'next/navigation'

export default function CatchAllPage() {
  notFound()
}

export const dynamicParams = true
export const generateStaticParams = () => []
