import { useState } from 'react'

import { cn } from '@/lib/utils'
import { supabase } from '@/lib/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleForgotPassword = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      location.href = "/dashboard"
    } catch (error: unknown) {
      setError(error instanceof Error ? handleError(error.message) : "OcurriÃ³ un error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleError = (error: string) => {
    switch (error) {
      case ("email rate limit exceeded"):
        return ("Error: espera 1 minuto antes de volver a intentarlo")
    }

    if (error.startsWith("Email address ")) {
      return ("Error: correo invÃ¡lido")
    }

    return error
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reinicica tu contraseÃ±a</CardTitle>
          <CardDescription>Ingresa tu nueva contraseÃ±a abajo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">Nueva contraseÃ±a</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nueva contraseÃ±a"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar nueva contraseÃ±a"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
