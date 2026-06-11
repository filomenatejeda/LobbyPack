import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const selectedFloor =
    tower.floors.find((floor) => floor.floor_number === tower.selected_floor) ?? tower.floors[0];
  const selectedFloorNumber = selectedFloor?.floor_number ?? 1;
  const maxFloor = tower.floors.length;

  return (
    <section className="towerCard">
      <div className="towerCardHeader">
        <div>
          <p className="settingsLabel">{labels.groupSingular}</p>
          <h3>{tower.tower_name}</h3>
        </div>

        {canEdit ? (
        <div className="towerHeaderActions">
          <button
            type="button"
            className="secondaryButton"
            onClick={() => onToggleEditing(tower.id)}
          >
            {tower.is_editing ? "Cerrar edición" : "Editar"}
          </button>
          <button
            type="button"
            className="towerRemoveButton"
            onClick={() => onRemove(tower.id)}
            disabled={!canRemove}
          >
            Eliminar
          </button>
        </div>
        ) : null}
      </div>

      <div className="towerSummaryGrid">
        <div className="towerSummaryItem">
          <span>{labels.groupName}</span>
          <strong>{tower.tower_name}</strong>
        </div>
        <div className="towerSummaryItem">
          <span>{labels.levelCount}</span>
          <strong>{tower.floors.length}</strong>
        </div>
        <div className="towerSummaryItem">
          <span>{labels.unitPlural} totales</span>
          <strong>{totalTowerUnits}</strong>
        </div>
      </div>

      {tower.is_editing && canEdit ? (
        <div className="towerEditor">
          <div className="settingsForm towerForm">
            <label className="settingsField">
              <span>{labels.groupName}</span>
              <input
                type="text"
                value={tower.tower_name}
                onChange={(event) => onUpdateName(tower.id, event.target.value)}
              />
            </label>

            <label className="settingsField">
              <span>{labels.levelCount}</span>
              <input
                type="number"
                min="1"
                max="50"
                value={tower.floors.length}
                onChange={(event) => onUpdateFloorCount(tower.id, event.target.value)}
              />
            </label>
          </div>

          <div className="floorEditorList">
            {tower.floors.map((floor) => (
              <section key={`${tower.id}-${floor.floor_number}`} className="floorEditor">
                <div className="floorEditorHeader">
                  <div>
                    <p className="settingsLabel">{labels.levelSingular}</p>
                    <h4>
                      {labels.levelSingular} {floor.floor_number}
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={() => onAddApartment(tower.id, floor.floor_number)}
                  >
                    {labels.addUnit}
                  </button>
                </div>

                <div className="apartmentEditorGrid">
                  {floor.apartments.map((apartment, apartmentIndex) => (
                    <div
                      key={`${tower.id}-${floor.floor_number}-${apartmentIndex}`}
                      className="apartmentEditorItem"
                    >
                      <input
                        type="text"
                        value={apartment}
                        onChange={(event) =>
                          onUpdateApartmentName(
                            tower.id,
                            floor.floor_number,
                            apartmentIndex,
                            event.target.value,
                          )
                        }
                      />
                      <button
                        type="button"
                        className="towerRemoveButton apartmentRemoveButton"
                        onClick={() =>
                          onRemoveApartment(tower.id, floor.floor_number, apartmentIndex)
                        }
                        disabled={floor.apartments.length === 1}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      <div className="towerPreview">
        <div className="towerPreviewHeader">
          <div>
            <p className="towerPreviewTitle">{labels.unitsByLevel}</p>
            <p className="towerPreviewText">
              {labels.previewText}
            </p>
          </div>

          <div className="towerFloorControl">
            <span className="towerFloorControlLabel">{labels.levelSingular}</span>
            <div className="towerFloorStepper" aria-label={`Seleccionar ${labels.levelSingular}`}>
              <button
                type="button"
                className="towerFloorIconButton"
                onClick={() => onSelectFloor(tower.id, String(selectedFloorNumber - 1))}
                disabled={selectedFloorNumber <= 1}
                aria-label={`${labels.levelSingular} anterior`}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>

              <label className="towerFloorNumberField">
                <span className="srOnly">{labels.levelSingular}</span>
                <input
                  type="number"
                  min="1"
                  max={maxFloor}
                  value={selectedFloorNumber}
                  onChange={(event) => onSelectFloor(tower.id, event.target.value)}
                />
              </label>

              <span className="towerFloorTotal">/ {maxFloor}</span>

              <button
                type="button"
                className="towerFloorIconButton"
                onClick={() => onSelectFloor(tower.id, String(selectedFloorNumber + 1))}
                disabled={selectedFloorNumber >= maxFloor}
                aria-label={`${labels.levelSingular} siguiente`}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

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

        <p className="towerPreviewText">
          {tower.tower_name} tiene {selectedFloor.apartments.length} {labels.unitPlural} en{" "}
          {labels.levelSingular.toLowerCase()}{" "}
          {selectedFloor.floor_number}.
        </p>
      </div>
    </section>
  );
}
