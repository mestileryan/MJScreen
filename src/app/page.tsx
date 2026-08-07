import IconSpriteLoader from '@/components/IconSpriteLoader'
import Screen from '@/components/Screen'
import { LibraryProvider } from '@/context/LibraryContext'

export default function Home() {
  return (
    <LibraryProvider>
      <IconSpriteLoader />
      <Screen />
    </LibraryProvider>
  )
}
