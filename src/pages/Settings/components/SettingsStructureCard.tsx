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

export default function SettingsStructureCard({
  canEdit,
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
  return (
    <article className="settingsCard settingsCardWide">
      <div className="settingsCardHeader">
        <div>
          <p className="settingsLabel">Estructura</p>
          <h2>{labels.title}</h2>
        </div>
        {canEdit ? (
          <button type="button" className="secondaryButton" onClick={onAddTower}>
            {labels.addGroup}
          </button>
        ) : null}
      </div>

      <p className="settingsSectionLead">{labels.sectionLead}</p>

      <div className="settingsStats">
        <div className="settingsStat">
          <strong>{towers.length}</strong>
          <span>{labels.groupPlural} registrados</span>
        </div>
        <div className="settingsStat">
          <strong>{totalFloors}</strong>
          <span>{labels.levelPlural} en total</span>
        </div>
        <div className="settingsStat">
          <strong>{totalUnits}</strong>
          <span>{labels.totalUnits}</span>
        </div>
      </div>

      <div className="towerList">
        {towers.length === 0 ? (
          <div className="settingsEmptyState">
            <strong>La estructura aun no esta configurada.</strong>
            <p>
              Agrega {labels.groupPlural.toLowerCase()} para comenzar a ordenar la comunidad.
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

      {canEdit ? (
        <div className="settingsActions">
          <button
            type="button"
            className="secondaryButton"
            onClick={onCancel}
            disabled={isSaving || isLoading}
          >
            Cancelar
          </button>
          <button type="button" className="primaryButton" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar estructura"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
