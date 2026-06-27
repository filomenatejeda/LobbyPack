import { useI18nContext } from "@/i18n/i18n-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Eye, EyeOff } from "lucide-react";
import { geoapifyApiKey, Phase } from "./constants";
import type { UseSignUpFormResult } from "./useSignUpForm";
import { getCommunityTypeLabel } from "../../../pages/Settings/settingsConfig";

type SignUpPhaseFieldsProps = {
  form: UseSignUpFormResult;
};

export default function SignUpPhaseFields({ form }: SignUpPhaseFieldsProps) {
  const { LL } = useI18nContext();

  return (
    <div className="authFields">
      {form.phase === Phase.Community && (
        <>
          <label className="authField">
            <span>{LL.auth_communityName()}</span>
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
            <span>{LL.settings_communityType()}</span>
            <select
              className="authInput"
              id="community-type"
              required
              value={form.communityType}
              onChange={(event) => form.setCommunityType(event.target.value)}
            >
              {communityTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {getCommunityTypeLabel(type, LL)}
                </option>
              ))}
            </select>
          </label>

          <label className="authField">
            <span>{LL.auth_country()}</span>
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
            <span>{LL.auth_city()}</span>
            <input
              className="authInput"
              id="community-location"
              type="text"
              autoComplete="address-level2"
              required
              disabled={!form.communityCountry.trim()}
              placeholder={
                form.communityCountry.trim()
                  ? LL.auth_cityPlaceholder()
                  : LL.auth_selectCountryFirst()
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
              <p className="authFieldNote">{LL.auth_cityEnable()}</p>
            )}
            {form.focusedAutocomplete === "location" && form.communityCountry.trim() && (
              <div className="authSuggestions">
                {!geoapifyApiKey && (
                  <div className="authSuggestionStatus">
                    {LL.auth_geoapifyCityMissing()}
                  </div>
                )}
                {form.isLoadingLocations && (
                  <div className="authSuggestionStatus">{LL.auth_loadingCities()}</div>
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
                      {LL.auth_noManualResultsCity()}
                    </div>
                  )}
              </div>
            )}
          </label>

          <label className="authField">
            <span>{LL.settings_address()}</span>
            <input
              className="authInput"
              id="community-address"
              type="text"
              autoComplete="street-address"
              required
              disabled={!form.communityCountry.trim() || !form.communityLocation.trim()}
              placeholder={
                form.communityCountry.trim() && form.communityLocation.trim()
                  ? LL.auth_addressPlaceholder()
                  : LL.auth_addressRequiredFirst()
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
              <p className="authFieldNote">{LL.auth_addressEnable()}</p>
            )}
            {form.focusedAutocomplete === "address" &&
            form.communityLocation.trim() &&
            form.communityCountry.trim() ? (
              <div className="authSuggestions">
                {!geoapifyApiKey && (
                  <div className="authSuggestionStatus">
                    {LL.auth_geoapifyAddressMissing()}
                  </div>
                )}
                {form.isLoadingAddresses && (
                  <div className="authSuggestionStatus">{LL.auth_loadingAddresses()}</div>
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
                      {LL.auth_noManualResultsAddress()}
                    </div>
                  )}
              </div>
            ) : null}
            {form.isCheckingCommunityAddress && (
              <p className="authFieldNote">{LL.auth_verifyingAddress()}</p>
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
            <span>{LL.auth_adminFirstName()}</span>
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
            <span>{LL.auth_adminLastName()}</span>
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
              {LL.auth_backToCommunity()}
            </button>
          </div>
        </>
      )}

      {form.phase !== Phase.Community && (
        <label className="authField">
          <span>{LL.auth_email()}</span>
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
            <span>{LL.auth_otpCode()}</span>
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
              {LL.auth_resendCode()}
            </button>
            <button
              type="button"
              className="authTextButton"
              onClick={() => form.resetToEmailStep()}
            >
              {LL.auth_changeEmail()}
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
                {LL.auth_totpLink()}
              </p>
              {form.mfaSecret ? (
                <p className="authMfaSecret">
                  {LL.auth_totpManual()} <strong>{form.mfaSecret}</strong>
                </p>
              ) : null}
            </div>
          </div>

          <label className="authField">
            <span>{LL.resident_authCode()}</span>
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
            <span>{LL.auth_password()}</span>
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
                  form.showPassword ? LL.auth_hidePassword() : LL.auth_showPassword()
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
            <span>{LL.auth_passwordConfirm()}</span>
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
                  form.showRepeatPassword ? LL.auth_hidePassword() : LL.auth_showPassword()
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
