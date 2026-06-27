import { useI18nContext } from "@/i18n/i18n-react";
import type { TowerConfig } from "../../types/settings";

type TowerCardProps = {
  tower: TowerConfig;
  labels: {
    groupSingular: string;
    groupName: string;
    levelSingular: string;
    levelPlural: string;
    levelCount: string;
    unitSingular: string;
    unitPlural: string;
    unitsByLevel: string;
    previewText: string;
    addUnit: string;
  };
  totalTowerUnits: number;
  canEdit: boolean;
  canRemove: boolean;
  onToggleEditing: (towerId: number) => void;
  onRemove: (towerId: number) => void;
  onUpdateName: (towerId: number, value: string) => void;
  onUpdateFloorCount: (towerId: number, value: string) => void;
  onSelectFloor: (towerId: number, value: string) => void;
  onAddApartment: (towerId: number, floor_number: number) => void;
  onApartmentClick: (departmentAddress: string) => void;
  onUpdateApartmentName: (
    towerId: number,
    floor_number: number,
    apartmentIndex: number,
    value: string,
  ) => void;
  onRemoveApartment: (towerId: number, floor_number: number, apartmentIndex: number) => void;
};

export default function TowerCard({
  tower,
  labels,
  totalTowerUnits,
  canEdit,
  canRemove,
  onToggleEditing,
  onRemove,
  onUpdateName,
  onUpdateFloorCount,
  onSelectFloor,
  onAddApartment,
  onApartmentClick,
  onUpdateApartmentName,
  onRemoveApartment,
}: TowerCardProps) {
  const { LL } = useI18nContext();
  const selectedFloor =
    tower.floors.find((floor) => floor.floor_number === tower.selected_floor) ?? tower.floors[0];
  const selectedFloorNumber = selectedFloor?.floor_number ?? 1;

  return (
    <section className="towerCard">
      <div className="towerCardHeader">
        <div>
          <p className="settingsLabel">{labels.groupSingular}</p>
          <h3>{tower.tower_name}</h3>
          <div className="towerMeta">
            <span>{tower.floors.length} {labels.levelPlural.toLowerCase()}</span>
            <span>{totalTowerUnits} {labels.unitPlural.toLowerCase()}</span>
          </div>
        </div>

        {canEdit ? (
        <div className="towerHeaderActions">
          <button
            type="button"
            className="secondaryButton"
            onClick={() => onToggleEditing(tower.id)}
          >
            {tower.is_editing ? LL.settings_close() : LL.resident_edit()}
          </button>
          <button
            type="button"
            className="towerRemoveButton"
            onClick={() => onRemove(tower.id)}
            disabled={!canRemove}
          >
            {LL.admin_delete()}
          </button>
        </div>
        ) : null}
      </div>

      <div className="towerPreview">
        <div className="towerPreviewHeader">
          <div>
            <p className="towerPreviewTitle">{labels.unitPlural}</p>
            <p className="towerPreviewText">
              {selectedFloor.apartments.length} {LL.settings_in()} {labels.levelSingular.toLowerCase()}{" "}
              {selectedFloorNumber}
            </p>
          </div>

          <label className="towerFloorSelectField">
            <span>{labels.levelSingular}</span>
            <select
              id={`tower-selected-floor-${tower.id}`}
              name="selected_floor"
              value={selectedFloorNumber}
              onChange={(event) => onSelectFloor(tower.id, event.target.value)}
            >
              {tower.floors.map((floor) => (
                <option key={`${tower.id}-floor-${floor.floor_number}`} value={floor.floor_number}>
                  {labels.levelSingular} {floor.floor_number}
                </option>
              ))}
            </select>
          </label>
        </div>

        {tower.is_editing && canEdit ? (
          <div className="towerInlineEditor">
            <div className="settingsForm towerForm">
              <label className="settingsField">
                <span>{labels.groupName}</span>
                <input
                  type="text"
                  id={`tower-name-${tower.id}`}
                  name="tower_name"
                  value={tower.tower_name}
                  onChange={(event) => onUpdateName(tower.id, event.target.value)}
                />
              </label>

              <label className="settingsField">
                <span>{labels.levelCount}</span>
                <input
                  type="number"
                  id={`tower-floor-count-${tower.id}`}
                  name="floor_count"
                  min="1"
                  max="50"
                  value={tower.floors.length}
                  onChange={(event) => onUpdateFloorCount(tower.id, event.target.value)}
                />
              </label>
            </div>

            <div className="floorEditorHeader">
              <strong>
                {labels.unitPlural} {LL.settings_fromLevel()} {labels.levelSingular.toLowerCase()}{" "}
                {selectedFloorNumber}
              </strong>
              <button
                type="button"
                className="secondaryButton"
                onClick={() => onAddApartment(tower.id, selectedFloorNumber)}
              >
                {labels.addUnit}
              </button>
            </div>

            <div className="apartmentEditorGrid">
              {selectedFloor.apartments.map((apartment, apartmentIndex) => (
                <div
                  key={`${tower.id}-${selectedFloor.floor_number}-${apartmentIndex}`}
                  className="apartmentEditorItem"
                >
                  <input
                    type="text"
                    id={`apartment-name-${tower.id}-${selectedFloor.floor_number}-${apartmentIndex}`}
                    name="apartment_name"
                    value={apartment}
                    onChange={(event) =>
                      onUpdateApartmentName(
                        tower.id,
                        selectedFloor.floor_number,
                        apartmentIndex,
                        event.target.value,
                      )
                    }
                  />
                  <button
                    type="button"
                    className="towerRemoveButton apartmentRemoveButton"
                    onClick={() =>
                      onRemoveApartment(tower.id, selectedFloor.floor_number, apartmentIndex)
                    }
                    disabled={selectedFloor.apartments.length === 1}
                  >
                    {LL.settings_remove()}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="towerPreviewChips">
            {selectedFloor.apartments.map((apartment) => (
              <button
                key={`${tower.id}-${selectedFloor.floor_number}-${apartment}`}
                type="button"
                className="towerChip"
                onClick={() => onApartmentClick(`${tower.tower_name} ${apartment}`)}
              >
                {apartment}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
