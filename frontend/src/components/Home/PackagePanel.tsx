import "./PackagePanel.css";
import PackageRow from "./PackageRow";
import { useI18n } from "../../lib/i18n";
import type { PackageServiceView, ParcelItem } from "../../types/home";

const SEARCH_MAX_LENGTH = 50;

type PackagePanelProps = {
  title: string;
  searchTerm: string;
  pageSize: number;
  pageSizeOptions: readonly number[];
  allVisibleSelected: boolean;
  filteredCount: number;
  safePage: number;
  totalPages: number;
  selectedVisibleCount: number;
  paginatedPackages: ParcelItem[];
  currentSelections: string[];
  activeView: PackageServiceView;
  senderEmail: string;
  qrAccessEnabled: boolean;
  onSearchChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
  onSelectAllVisible: (checked: boolean) => void;
  onEditSelected: () => void;
  onDeleteSelected: () => void;
  onSelect: (view: PackageServiceView, id: string, checked: boolean) => void;
  onShowQr: (item: ParcelItem) => void;
  onShowPin: (item: ParcelItem) => void;
  onEdit: (view: PackageServiceView, id: string) => void;
  onDelete: (view: PackageServiceView, ids: string[]) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  startIndex: number;
};

export default function PackagePanel(props: PackagePanelProps) {
  const { t } = useI18n();
  const {
    title,
    searchTerm,
    pageSize,
    pageSizeOptions,
    allVisibleSelected,
    filteredCount,
    safePage,
    totalPages,
    selectedVisibleCount,
    paginatedPackages,
    currentSelections,
    activeView,
    senderEmail,
    qrAccessEnabled,
    onSearchChange,
    onPageSizeChange,
    onSelectAllVisible,
    onEditSelected,
    onDeleteSelected,
    onSelect,
    onShowQr,
    onShowPin,
    onEdit,
    onDelete,
    onPrevPage,
    onNextPage,
    startIndex,
  } = props;

  return (
    <section className="servicePanel" aria-live="polite">
      <div className="panelHeader">
        <h2>{title}</h2>
      </div>
      <div className="panelTools">
        <label className="searchField">
          <span>{t("admin.searchPackage")}</span>
          <div className="searchInputWrap">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="searchIcon">
              <path
                d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m19 19-3.2-3.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="search"
              value={searchTerm}
              maxLength={SEARCH_MAX_LENGTH}
              onChange={(event) => onSearchChange(event.target.value.slice(0, SEARCH_MAX_LENGTH))}
              placeholder={t("admin.searchPackagePlaceholder")}
            />
          </div>
        </label>

        <label className="selectAllField">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={(event) => onSelectAllVisible(event.target.checked)}
          />
          <span>{t("admin.selectVisible")}</span>
        </label>

        <div className="bulkActions">
          <button
            type="button"
            className="toolbarButton"
            onClick={onEditSelected}
            disabled={selectedVisibleCount !== 1}
            aria-label={t("admin.editSelectedPackage")}
            title={t("resident.edit")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="actionIcon">
              <path
                d="M4 20h4l10.5-10.5a1.4 1.4 0 0 0 0-2L16.5 5a1.4 1.4 0 0 0-2 0L4 15.5V20Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13.5 6l4.5 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className="toolbarButton dangerButton"
            onClick={onDeleteSelected}
            disabled={selectedVisibleCount === 0}
            aria-label={t("admin.deleteSelectedPackages")}
            title={t("admin.delete")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="actionIcon">
              <path
                d="M5 7h14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M9 7V5.8C9 4.8 9.8 4 10.8 4h2.4C14.2 4 15 4.8 15 5.8V7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 7l.8 11c.1 1.1 1 2 2.1 2h4.2c1.1 0 2-.9 2.1-2L17 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 11v5M14 11v5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <p className="resultsText">
        {filteredCount}{" "}
        {filteredCount === 1 ? t("admin.totalPackage") : t("admin.totalPackages")} -{" "}
        {t("admin.page")} {safePage} {t("admin.of")} {totalPages} - {selectedVisibleCount}{" "}
        {selectedVisibleCount === 1 ? t("admin.selected") : t("admin.selectedPlural")}
      </p>

      <ul className="packageList">
        {paginatedPackages.map((item) => (
          <PackageRow
            key={item.id}
            item={item}
            activeView={activeView}
            senderEmail={senderEmail}
            qrAccessEnabled={qrAccessEnabled}
            checked={currentSelections.includes(item.id)}
            onSelect={onSelect}
            onShowQr={onShowQr}
            onShowPin={onShowPin}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>

      {filteredCount === 0 ? (
        <p className="emptyState">{t("admin.noPackageResults")}</p>
      ) : (
        <div className="panelFooter">
          <label className="pageSizeField">
            <span>{t("admin.show")}</span>
            <select
              className="pageSizeSelect"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <div className="pagination">
            <button
              type="button"
              className="paginationButton"
              onClick={onPrevPage}
              disabled={safePage === 1}
            >
              {t("admin.previous")}
            </button>
            <span className="paginationInfo">
              {t("admin.showing")} {startIndex + 1}-
              {Math.min(startIndex + pageSize, filteredCount)} {t("admin.of")} {filteredCount}
            </span>
            <button
              type="button"
              className="paginationButton"
              onClick={onNextPage}
              disabled={safePage === totalPages}
            >
              {t("admin.next")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
