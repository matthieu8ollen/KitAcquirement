import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { useEffect } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Optional: Add any global app initialization here
    console.log('Jersey Inventory App initialized')
  }, [])

  return <Component {...pageProps} />
}
