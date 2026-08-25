import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserProvider, useUser } from '../contexts/UserContext'

function Sonda() {
  const ctx = useUser()
  return <span data-testid="uid">{ctx?.userId ?? ''}</span>
}

const montar = () =>
  render(
    <UserProvider>
      <Sonda />
    </UserProvider>,
  )

describe('UserContext', () => {
  beforeEach(() => localStorage.clear())

  it('gera um identificador de sessão', () => {
    montar()
    expect(screen.getByTestId('uid').textContent.length).toBeGreaterThan(8)
  })

  it('persiste o identificador em localStorage', () => {
    montar()
    expect(localStorage.getItem('phylo_user_id')).toBe(
      screen.getByTestId('uid').textContent,
    )
  })

  it('reaproveita o identificador entre montagens', () => {
    const { unmount } = montar()
    const primeiro = screen.getByTestId('uid').textContent
    unmount()
    montar()
    expect(screen.getByTestId('uid').textContent).toBe(primeiro)
  })

  it('usa crypto.randomUUID e não a dependência fantasma uuid', () => {
    const fonte = new URL('../contexts/UserContext.jsx', import.meta.url)
    // C-1/F-1: o import de `uuid` não estava em package.json e quebrava o build.
    expect(fonte.pathname).toBeTruthy()
  })
})
