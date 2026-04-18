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
  Email: 0,
  OTP: 1,
  MFA: 2,
  User: 3
}

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [MFAFactor, setMFAFactor] = useState<{ id: string; type: "totp"; friendly_name?: string | undefined; totp: { qr_code: string; secret: string; uri: string; }; } | null>(null)
  const [MFAChallengeID, setMFAChallengeID] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [buttonIdleText, setButtonIdleText] = useState("Verificar correo")
  const [OTPCode, setOTPCode] = useState('')
  const [MFACode, setMFACode] = useState('')
  const [phase, setPhase] = useState(Phase.Email)

  const handleSignUp = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setError(null)

		if (phase === Phase.User && username.trim().length === 0) {
			setError("Ingresa un nombre de usuario")
		}
    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden")
      return
    }
    setIsLoading(true)

    try {
      switch (phase) {
        // Paso 1: Ingresa el correo y verificar que existe
        case (Phase.Email):
          const signedInWithOtp = await supabase.auth.signInWithOtp({ email })

          if (signedInWithOtp.error) throw signedInWithOtp.error


          setPhase(Phase.OTP)
          setButtonIdleText("Verificar código del correo")
          break
        
        // Paso 2: Código único por correo para verificar validez del correo electrónico
        case (Phase.OTP):
          const verifiedOtp = await supabase.auth.verifyOtp({ email, token: OTPCode, type: "email" })

          if (verifiedOtp.error) throw verifiedOtp.error


          const MFAFactors = (await supabase.auth.mfa.listFactors()).data?.all
          let challenge


          if (!MFAFactors || MFAFactors.length === 0) {
            const enroll = await supabase.auth.mfa.enroll({
              factorType: 'totp',
              friendlyName: 'Authenticator'
            })

            if (enroll.error) throw enroll.error


            setMFAFactor(enroll.data)
            challenge = await supabase.auth.mfa.challenge({ factorId: enroll.data.id })
          } else {
            const existingFactor = MFAFactors[0]


            await supabase.auth.mfa.unenroll({ factorId: existingFactor.id })


            const enroll = await supabase.auth.mfa.enroll({
              factorType: 'totp',
              friendlyName: 'Authenticator'
            })

            if (enroll.error) throw enroll.error

            
            setMFAFactor(enroll.data)
            challenge = await supabase.auth.mfa.challenge({ factorId: enroll.data.id })
          }

          if (challenge.error) throw challenge.error


          setMFAChallengeID(challenge.data.id)
          setPhase(Phase.MFA)
          setButtonIdleText("Verificar código del autenticador")
          break
        
        // Paso 3: Verificar segundo factor de autenticación
        case (Phase.MFA):
          const verifiedMFA = await supabase.auth.mfa.verify({
            factorId: MFAFactor?.id ?? '',
            challengeId: MFAChallengeID,
            code: MFACode
          })

          if (verifiedMFA.error) throw verifiedMFA.error


          setPhase(Phase.User)
          setButtonIdleText("Finalizar creación de cuenta")
          break
        
        // Paso 4: Ingresar nombre de usuario y crear contraseña
        case (Phase.User):
          const updatedUser = await supabase.auth.updateUser({ password })
          if (updatedUser.error) throw updatedUser.error
          location.href = "/dashboard"
          break
      }
    } catch (error: unknown) {
        setError(error instanceof Error ? handleError(error.message) : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  // Reenviar código de verificación del correo
  const resendEmail = async () => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) throw error
    } catch (error: unknown) {
        setError(error instanceof Error ? handleError(error.message) : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  // Volver al Paso 1 para poder editar el correo electrónico
  const allowEmailChange = () => {
    setPhase(Phase.Email)
    setOTPCode('')
    setError(null)
  }

  // Muestra errores comunes con sus traducciones simplificadas
  const handleError = (error: string) => {
    switch (error) {
      case ("email rate limit exceeded"):
        return ("Error: espera 1 minuto antes de volver a intentarlo")
      
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
          <CardTitle className="text-2xl">Creación de cuenta</CardTitle>
          <CardDescription>Crea una nueva cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                  required
                  readOnly={phase !== Phase.Email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onInput={(e) => e.currentTarget.setCustomValidity('')}
                  onInvalid={(e) => e.currentTarget.setCustomValidity("Ingresa un correo electrónico válido por favor.")}
                />
              </div>
              {phase === Phase.OTP && (
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="OTP">Ingresa el código de verificación</Label>
                  </div>
                  <InputOTP id="OTP" maxLength={8} pattern={REGEXP_ONLY_DIGITS} value={OTPCode} onChange={(OTPvalue) => setOTPCode(OTPvalue)} disabled={phase > Phase.OTP}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} id='0'/>
                      <InputOTPSlot index={1} id='1'/>
                      <InputOTPSlot index={2} id='2'/>
                      <InputOTPSlot index={3} id='3'/>
                      <InputOTPSlot index={4} id='4'/>
                      <InputOTPSlot index={5} id='5'/>
                      <InputOTPSlot index={6} id='6'/>
                      <InputOTPSlot index={7} id='7'/>
                    </InputOTPGroup>
                  </InputOTP>
                  <p>¿No te ha llegado el código de verificación? Prueba a <Button className={"cursor-pointer"} onClick={() => resendEmail()}>reenviar el código</Button>.</p>
                  <p>Si quieres cambiar el correo, haz click <Button className="cursor-pointer" onClick={() => allowEmailChange()}>aquí</Button>.</p>
                </div>
              )}
              {phase === Phase.MFA && (
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="MFA">Segundo factor de autenticación</Label>
                  </div>
                  {MFAFactor != null && <img src={MFAFactor.totp.qr_code} alt={MFAFactor.totp.uri}/>}
                  <InputOTP id="MFA" maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={MFACode} onChange={(MFAvalue) => setMFACode(MFAvalue)} disabled={phase > Phase.MFA}>
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
              {phase === Phase.User && (
                <>
									<div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="username">Nombre de usuario</Label>
                    </div>
										<Input
                      id="username"
                      type="username"
                      autoComplete="username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onInput={(e) => e.currentTarget.setCustomValidity('')}
                      onInvalid={(e) => e.currentTarget.setCustomValidity("Ingresa un nombre de usuario por favor.")}
                    />
									</div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Contraseña</Label>
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
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="repeat-password">Repite la contraseña</Label>
                    </div>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      onInput={(e) => e.currentTarget.setCustomValidity('')}
                      onInvalid={(e) => e.currentTarget.setCustomValidity("Repite la contraseña por favor.")}
                    />
                  </div>
                </>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                {isLoading ? "Cargando..." : buttonIdleText}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              ¿Ya tienes una cuenta?{' '}
              <a href="/auth/login" className="underline underline-offset-4">
                Inicia sesión
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}