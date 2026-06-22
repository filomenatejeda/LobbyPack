import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Eye, EyeOff } from "lucide-react";
import { COMMUNITY_TYPE_OPTIONS, geoapifyApiKey, Phase } from "./constants";
import type { UseSignUpFormResult } from "./useSignUpForm";

type SignUpPhaseFieldsProps = {
  form: UseSignUpFormResult;
};

export default function SignUpPhaseFields({ form }: SignUpPhaseFieldsProps) {
  return (
    <div className="authFields">
      {form.phase === Phase.Community && (
        <>
          <label className="authField">
            <span>Nombre de la comunidad</span>
            <input
              className="authInput"
              id="community-name"
              type="text"
              autoComplete="organization"
              required
              value={form.communityName}
              onChange={(event) => form.setCommunityName(event.target.value)}
            />
          </label>

          <label className="authField">
            <span>Tipo de comunidad</span>
            <select
              className="authInput"
              id="community-type"
              required
              value={form.communityType}
              onChange={(event) => form.setCommunityType(event.target.value)}
            >
              {COMMUNITY_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="authField">
            <span>Pais</span>
            <input
              className="authInput"
              id="community-country"
              type="text"
              autoComplete="country-name"
              required
              value={form.communityCountry}
              onBlur={() => window.setTimeout(() => form.setFocusedAutocomplete(null), 120)}
              onChange={(event) => {
                form.setCommunityCountry(event.target.value);
                form.setFocusedAutocomplete("country");
              }}
              onFocus={() => form.setFocusedAutocomplete("country")}
            />
            {form.focusedAutocomplete === "country" && form.countrySuggestions.length > 0 && (
              <div className="authSuggestions">
                {form.countrySuggestions.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    className="authSuggestion"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      form.selectCountrySuggestion(country.name);
                    }}
                  >
                    {country.name}
                  </button>
                ))}
              </div>
            )}
          </label>

          <label className="authField">
            <span>Ciudad</span>
            <input
              className="authInput"
              id="community-location"
              type="text"
              autoComplete="address-level2"
              required
              disabled={!form.communityCountry.trim()}
              placeholder={
                form.communityCountry.trim()
                  ? "Ingresa tu ciudad"
                  : "Primero selecciona un pais"
              }
              value={form.communityLocation}
              onBlur={() => window.setTimeout(() => form.setFocusedAutocomplete(null), 120)}
              onChange={(event) => {
                form.setCommunityLocation(event.target.value);
                form.setFocusedAutocomplete("location");
              }}
              onFocus={() => {
                if (!form.communityCountry.trim()) {
                  return;
                }
                form.setFocusedAutocomplete("location");
              }}
            />
            {!form.communityCountry.trim() && (
              <p className="authFieldNote">
                Selecciona primero un pais para habilitar la ciudad.
              </p>
            )}
            {form.focusedAutocomplete === "location" && form.communityCountry.trim() && (
              <div className="authSuggestions">
                {!geoapifyApiKey && (
                  <div className="authSuggestionStatus">
                    Falta configurar la clave de Geoapify para buscar ciudades.
                  </div>
                )}
                {form.isLoadingLocations && (
                  <div className="authSuggestionStatus">Buscando ciudades...</div>
                )}
                {!form.isLoadingLocations &&
                  form.locationSuggestions.map((location) => (
                    <button
                      key={location}
                      type="button"
                      className="authSuggestion"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        form.selectLocationSuggestion(location);
                      }}
                    >
                      {location}
                    </button>
                  ))}
                {!form.isLoadingLocations &&
                  geoapifyApiKey &&
                  form.communityLocation.trim().length >= 2 &&
                  form.locationSuggestions.length === 0 && (
                    <div className="authSuggestionStatus">
                      Sin resultados, puedes escribirlo manualmente.
                    </div>
                  )}
              </div>
            )}
          </label>

          <label className="authField">
            <span>Direccion</span>
            <input
              className="authInput"
              id="community-address"
              type="text"
              autoComplete="street-address"
              required
              disabled={!form.communityCountry.trim() || !form.communityLocation.trim()}
              placeholder={
                form.communityCountry.trim() && form.communityLocation.trim()
                  ? "Ingresa tu direccion"
                  : "Primero selecciona pais y ciudad"
              }
              value={form.communityAddress}
              onBlur={() => window.setTimeout(() => form.setFocusedAutocomplete(null), 120)}
              onChange={(event) => {
                form.setCommunityAddress(event.target.value);
                form.setFocusedAutocomplete("address");
              }}
              onFocus={() => {
                if (!form.communityCountry.trim() || !form.communityLocation.trim()) {
                  return;
                }
                form.setFocusedAutocomplete("address");
              }}
            />
            {(!form.communityCountry.trim() || !form.communityLocation.trim()) && (
              <p className="authFieldNote">
                Selecciona pais y ciudad para habilitar la direccion.
              </p>
            )}
            {form.focusedAutocomplete === "address" &&
            form.communityLocation.trim() &&
            form.communityCountry.trim() ? (
              <div className="authSuggestions">
                {!geoapifyApiKey && (
                  <div className="authSuggestionStatus">
                    Falta configurar la clave de Geoapify para buscar direcciones.
                  </div>
                )}
                {form.isLoadingAddresses && (
                  <div className="authSuggestionStatus">Buscando direcciones...</div>
                )}
                {!form.isLoadingAddresses &&
                  form.addressSuggestions.map((address) => (
                    <button
                      key={address}
                      type="button"
                      className="authSuggestion"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        form.selectAddressSuggestion(address);
                      }}
                    >
                      {address}
                    </button>
                  ))}
                {!form.isLoadingAddresses &&
                  geoapifyApiKey &&
                  form.communityAddress.trim().length >= 3 &&
                  form.addressSuggestions.length === 0 && (
                    <div className="authSuggestionStatus">
                      Sin resultados, puedes escribirla manualmente.
                    </div>
                  )}
              </div>
            ) : null}
            {form.isCheckingCommunityAddress && (
              <p className="authFieldNote">Verificando direccion...</p>
            )}
            {!form.isCheckingCommunityAddress && form.communityAddressStatus.message && (
              <p className={`authFieldNote authFieldNote-${form.communityAddressStatus.type}`}>
                {form.communityAddressStatus.message}
              </p>
            )}
          </label>
        </>
      )}

      {form.phase === Phase.Admin && (
        <>
          <label className="authField">
            <span>Nombre de la persona administradora</span>
            <input
              className="authInput"
              id="admin-first-name"
              type="text"
              autoComplete="given-name"
              required
              value={form.adminFirstName}
              onChange={(event) => form.setAdminFirstName(event.target.value)}
            />
          </label>

          <label className="authField">
            <span>Apellido de la persona administradora</span>
            <input
              className="authInput"
              id="admin-last-name"
              type="text"
              autoComplete="family-name"
              required
              value={form.adminLastName}
              onChange={(event) => form.setAdminLastName(event.target.value)}
            />
          </label>

          <div className="authHelperGroup">
            <button
              type="button"
              className="authTextButton"
              onClick={() => form.goToPreviousStep()}
            >
              Volver a comunidad
            </button>
          </div>
        </>
      )}

      {form.phase !== Phase.Community && (
        <label className="authField">
          <span>Correo electronico</span>
          <input
            className="authInput"
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            autoComplete="email"
            required
            readOnly={form.phase !== Phase.Admin || form.isCompletingGoogleRegistration}
            value={form.email}
            onChange={(event) => form.setEmail(event.target.value)}
          />
        </label>
      )}

      {form.phase === Phase.OTP && (
        <>
          <label className="authField">
            <span>Codigo OTP</span>
            <input
              className="authInput authInputCode"
              id="otp"
              inputMode="numeric"
              maxLength={8}
              placeholder="123456"
              required
              value={form.otpCode}
              onChange={(event) => form.setOtpCode(event.target.value)}
            />
          </label>

          <div className="authHelperGroup">
            <button
              type="button"
              className="authTextButton"
              onClick={() => void form.resendEmail()}
            >
              Reenviar codigo
            </button>
            <button
              type="button"
              className="authTextButton"
              onClick={() => form.resetToEmailStep()}
            >
              Cambiar correo
            </button>
          </div>
        </>
      )}

      {form.phase === Phase.MFA && (
        <>
          <div className="authMfaPanel">
            <div className="authMfaQrBox">
              {form.mfaSecret !== "" && <img src={form.mfaQrCode} alt={form.mfaQrUri} />}
            </div>

            <div className="authMfaInfo">
              <p className="authMfaText">
                Vincula esta cuenta con tu autenticador escaneando el QR.
              </p>
              {form.mfaSecret ? (
                <p className="authMfaSecret">
                  Tambien puedes usar esta clave manual: <strong>{form.mfaSecret}</strong>
                </p>
              ) : null}
            </div>
          </div>

          <label className="authField">
            <span>Codigo del autenticador</span>
            <input
              className="authInput authInputCode"
              id="mfa"
              inputMode="numeric"
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              placeholder="123456"
              required
              value={form.mfaCode}
              onChange={(event) => form.setMfaCode(event.target.value)}
            />
          </label>
        </>
      )}

      {form.phase === Phase.Password && (
        <>
          <label className="authField">
            <span>Contrasena</span>
            <div className="authPasswordInputWrap">
              <input
                className="authInput authInputWithAction"
                id="password"
                type={form.showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                required
                value={form.password}
                onChange={(event) => form.setPassword(event.target.value)}
              />
              <button
                type="button"
                className="authInputIconButton"
                aria-label={
                  form.showPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                }
                onClick={() => form.setShowPassword((current) => !current)}
              >
                {form.showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="authPasswordChecklist">
            {form.passwordChecks.map((requirement) => (
              <div
                key={requirement.label}
                className={
                  requirement.isValid
                    ? "authPasswordRequirement authPasswordRequirementValid"
                    : "authPasswordRequirement"
                }
              >
                <span className="authPasswordRequirementIcon">
                  {requirement.isValid ? "OK" : ""}
                </span>
                {requirement.label}
              </div>
            ))}
          </div>

          <label className="authField">
            <span>Confirmar contrasena</span>
            <div className="authPasswordInputWrap">
              <input
                className="authInput authInputWithAction"
                id="repeat-password"
                type={form.showRepeatPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={form.repeatPassword}
                onChange={(event) => form.setRepeatPassword(event.target.value)}
              />
              <button
                type="button"
                className="authInputIconButton"
                aria-label={
                  form.showRepeatPassword ? "Ocultar contrasena" : "Mostrar contrasena"
                }
                onClick={() => form.setShowRepeatPassword((current) => !current)}
              >
                {form.showRepeatPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
        </>
      )}

      {form.displayError && <p className="authError">{form.displayError}</p>}
    </div>
  );
}
