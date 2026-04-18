import type { TowerConfig } from "../../types/settings";

type TowerCardProps = {
  tower: TowerConfig;
  totalTowerUnits: number;
  canRemove: boolean;
  onToggleEditing: (towerId: number) => void;
  onRemove: (towerId: number) => void;
  onUpdateName: (towerId: number, value: string) => void;
  onUpdateFloorCount: (towerId: number, value: string) => void;
  onSelectFloor: (towerId: number, value: string) => void;
  onAddApartment: (towerId: number, floor_number: number) => void;
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
  totalTowerUnits,
  canRemove,
  onToggleEditing,
  onRemove,
  onUpdateName,
  onUpdateFloorCount,
  onSelectFloor,
  onAddApartment,
  onUpdateApartmentName,
  onRemoveApartment,
}: TowerCardProps) {
  const selectedFloor =
    tower.floors.find((floor) => floor.floor_number === tower.selected_floor) ?? tower.floors[0];

  return (
    <section className="towerCard">
      <div className="towerCardHeader">
        <div>
          <p className="settingsLabel">Torre</p>
          <h3>{tower.tower_name}</h3>
        </div>

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
      </div>

      <div className="towerSummaryGrid">
        <div className="towerSummaryItem">
          <span>Nombre de la torre</span>
          <strong>{tower.tower_name}</strong>
        </div>
        <div className="towerSummaryItem">
          <span>Cantidad de pisos</span>
          <strong>{tower.floors.length}</strong>
        </div>
        <div className="towerSummaryItem">
          <span>Departamentos totales</span>
          <strong>{totalTowerUnits}</strong>
        </div>
      </div>

      {tower.is_editing ? (
        <div className="towerEditor">
          <div className="settingsForm towerForm">
            <label className="settingsField">
              <span>Nombre de la torre</span>
              <input
                type="text"
                value={tower.tower_name}
                onChange={(event) => onUpdateName(tower.id, event.target.value)}
              />
            </label>

            <label className="settingsField">
              <span>Cantidad de pisos</span>
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
                    <p className="settingsLabel">Piso</p>
                    <h4>Piso {floor.floor_number}</h4>
                  </div>
                  <button
                    type="button"
                    className="secondaryButton"
                    onClick={() => onAddApartment(tower.id, floor.floor_number)}
                  >
                    Agregar departamento
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
            <p className="towerPreviewTitle">Departamentos por piso</p>
            <p className="towerPreviewText">
              Selecciona un piso para ver solo sus departamentos.
            </p>
          </div>

          <label className="settingsField towerFloorField">
            <span>Piso</span>
            <select
              value={tower.selected_floor}
              onChange={(event) => onSelectFloor(tower.id, event.target.value)}
            >
              {tower.floors.map((floor) => (
                <option key={`${tower.id}-floor-${floor.floor_number}`} value={floor.floor_number}>
                  Piso {floor.floor_number}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="towerPreviewChips">
          {selectedFloor.apartments.map((apartment) => (
            <span key={`${tower.id}-${selectedFloor.floor_number}-${apartment}`} className="towerChip">
              {apartment}
            </span>
          ))}
        </div>

        <p className="towerPreviewText">
          {tower.tower_name} tiene {selectedFloor.apartments.length} departamentos en el piso{" "}
          {selectedFloor.floor_number}.
        </p>
      </div>
    </section>
  );
}
