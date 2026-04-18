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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from '@/components/ui/input-otp'
import { REGEXP_ONLY_DIGITS } from 'input-otp'

const Phase = {
  Login: 0,
  MFA: 1
}

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [phase, setPhase] = useState(Phase.Login)
  const [MFAChallengeID, setMFAChallengeID] = useState('')
  const [MFAFactorID, setMFAFactorID] = useState('')
  const [MFACode, setMFACode] = useState('')
  const [buttonIdleText, setButtonIdleText] = useState("Iniciar sesión")

  const handleLogin = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      switch (phase) {
        // Paso 1: Ingresar usuario y contraseña
        case (Phase.Login):
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          
          if (error) throw error


          const C_MFAFactorID = (await supabase.auth.mfa.listFactors()).data?.all[0].id


          if (!C_MFAFactorID) {
            throw new Error("Error: no se encontró un segundo factor de autenticación")
          }


          setMFAFactorID(C_MFAFactorID)
          const challenge = await supabase.auth.mfa.challenge({ factorId: C_MFAFactorID })

          if (challenge.error) throw challenge.error


          setMFAChallengeID(challenge.data.id)
          setPhase(Phase.MFA)
          setButtonIdleText("Verificar código del autenticador e iniciar sesión")
          break
        
        // Paso 2: Verificar segundo factor de autenticación
        case (Phase.MFA):
          const verifiedMFA = await supabase.auth.mfa.verify({
            factorId: MFAFactorID,
            challengeId: MFAChallengeID,
            code: MFACode
          })

          if (verifiedMFA.error) throw verifiedMFA.error


          location.href = '/dashboard'
          break
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? handleError(error.message) : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  // Muestra errores comunes con sus traducciones simplificadas
  const handleError = (error: string) => {
    switch (error) {
      case ("Invalid login credentials"):
        return ("Error: contraseña inválida")

      case ("Code needs to be non-empty"):
        return ("Error: ingresa un código de verificación")

      case ("Invalid TOTP code entered"):
        return ("Error: ingresa un código de verificación válido")
    }

    if (error.startsWith("Email address ")) {
      return ("Error: correo inválido")
    }

    return error
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Inicia sesión</CardTitle>
          <CardDescription>Ingresa tu correo electrónico y contraseña abajo para iniciar tu sesión</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onInput={(e) => e.currentTarget.setCustomValidity('')}
                  onInvalid={(e) => e.currentTarget.setCustomValidity("Ingresa un correo electrónico válido por favor.")}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Contraseña</Label>
                  <a
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onInput={(e) => e.currentTarget.setCustomValidity('')}
                  onInvalid={(e) => e.currentTarget.setCustomValidity("Ingresa una contraseña por favor.")}
                />
              </div>
              {phase > Phase.Login && (
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="MFA">Segundo factor de autenticación</Label>
                  </div>
                  <InputOTP id="MFA" maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={MFACode} onChange={(MFAvalue) => setMFACode(MFAvalue)}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                {isLoading ? "Cargando..." : buttonIdleText}
              </Button>
              <Button variant="ghost" className="w-full cursor-pointer">
                <a href='#'>Iniciar sesión con Google</a>
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              ¿No tienes una cuenta?{' '}
              <a href="/auth/sign-up" className="underline underline-offset-4">
                Crea una cuenta
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}