import { useI18nContext } from "@/i18n/i18n-react";
import TowerCard from "../../../components/Settings/TowerCard";
import type { TowerConfig } from "../../../types/settings";
import type { StructureLabels } from "../settingsConfig";

type SettingsStructureCardProps = {
  canEdit: boolean;
  isLoading: boolean;
  isSaving: boolean;
  labels: StructureLabels;
  onAddApartment: (towerId: number, floorNumber: number) => void;
  onAddTower: () => void;
  onApartmentClick: (apartmentName: string) => void;
  onCancel: () => void;
  onRemoveApartment: (towerId: number, floorNumber: number, apartmentIndex: number) => void;
  onRemoveTower: (towerId: number) => void;
  onSave: () => void;
  onSelectFloor: (towerId: number, value: string) => void;
  onToggleEditing: (towerId: number) => void;
  onUpdateApartmentName: (
    towerId: number,
    floorNumber: number,
    apartmentIndex: number,
    value: string,
  ) => void;
  onUpdateFloorCount: (towerId: number, value: string) => void;
  onUpdateTowerName: (towerId: number, value: string) => void;
  totalFloors: number;
  totalUnits: number;
  towers: TowerConfig[];
};

export default function SettingsStructureCard({canEdit,
  isLoading,
  isSaving,
  labels,
  onAddApartment,
  onAddTower,
  onApartmentClick,
  onCancel,
  onRemoveApartment,
  onRemoveTower,
  onSave,
  onSelectFloor,
  onToggleEditing,
  onUpdateApartmentName,
  onUpdateFloorCount,
  onUpdateTowerName,
  totalFloors,
  totalUnits,
  towers,
}: SettingsStructureCardProps) {
  const { LL } = useI18nContext();
  const isEditingStructure = towers.some((tower) => tower.is_editing);

  return (
    <article className="settingsCard settingsCardWide">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">{LL.settings_structure()}</p>
          <h2>{labels.title}</h2>
        </div>
        {canEdit ? (
          <div className="structureHeaderActions">
            {isEditingStructure ? (
              <>
                <button
                  type="button"
                  className="secondaryButton"
                  onClick={onCancel}
                  disabled={isSaving || isLoading}
                >
                  {LL.admin_cancel()}
                </button>
                <button
                  type="button"
                  className="primaryButton"
                  onClick={onSave}
                  disabled={isSaving}
                >
                  {isSaving ? LL.resident_saving() : LL.resident_save()}
                </button>
              </>
            ) : null}
            <button type="button" className="secondaryButton" onClick={onAddTower}>
              {labels.addGroup}
            </button>
          </div>
        ) : null}
      </div>

      <p className="settingsSectionLead">{labels.sectionLead}</p>

      <div className="settingsStats">
        <div className="settingsStat">
          <strong>{towers.length}</strong>
          <span>{labels.groupPlural} {LL.settings_registered()}</span>
        </div>
        <div className="settingsStat">
          <strong>{totalFloors}</strong>
          <span>{labels.levelPlural} {LL.settings_total()}</span>
        </div>
        <div className="settingsStat">
          <strong>{totalUnits}</strong>
          <span>{labels.totalUnits}</span>
        </div>
      </div>

      <div className="towerList">
        {towers.length === 0 ? (
          <div className="settingsEmptyState">
            <strong>{LL.settings_emptyStructure()}</strong>
            <p>
              {LL.settings_emptyStructureText({ groups: labels.groupPlural.toLowerCase() })}
            </p>
          </div>
        ) : null}

        {towers.map((tower) => {
          const totalTowerUnits = tower.floors.reduce(
            (sum, floor) => sum + floor.apartments.length,
            0,
          );

          return (
            <TowerCard
              key={tower.id}
              tower={tower}
              labels={labels}
              totalTowerUnits={totalTowerUnits}
              canRemove={towers.length > 1}
              canEdit={canEdit}
              onToggleEditing={onToggleEditing}
              onRemove={onRemoveTower}
              onUpdateName={onUpdateTowerName}
              onUpdateFloorCount={onUpdateFloorCount}
              onSelectFloor={onSelectFloor}
              onAddApartment={onAddApartment}
              onApartmentClick={onApartmentClick}
              onUpdateApartmentName={onUpdateApartmentName}
              onRemoveApartment={onRemoveApartment}
            />
          );
        })}
      </div>

    </article>
  );
}
