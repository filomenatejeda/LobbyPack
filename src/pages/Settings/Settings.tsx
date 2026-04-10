import { useState } from "react";
import "./Settings.css";

const preferenceItems = [
  {
    title: "Notificaciones de paquetes",
    description: "Recibe alertas cuando un paquete sea recepcionado, retirado o actualizado.",
  },
  {
    title: "Resumen diario",
    description: "Genera un reporte automatico con la actividad del dia para conserjeria.",
  },
  {
    title: "Acceso con QR",
    description: "Permite validar retiros de paquetes usando codigo QR desde recepcion.",
  },
];

const teamItems = [
  { name: "Marcos Silva", role: "Conserje turno manana", status: "Activo" },
  { name: "Daniela Riquelme", role: "Conserje turno tarde", status: "Activo" },
  { name: "Paula Muñoz", role: "Supervisora recepcion", status: "Admin" },
];

type FloorConfig = {
  floorNumber: number;
  apartments: string[];
};

type TowerConfig = {
  id: number;
  name: string;
  floors: FloorConfig[];
  selectedFloor: number;
  isEditing: boolean;
};

function clampCount(value: number) {
  return Math.max(1, Math.min(50, value));
}

function buildApartmentName(floorNumber: number, apartmentIndex: number) {
  return `${floorNumber}${String(apartmentIndex).padStart(2, "0")}`;
}

function createFloor(floorNumber: number, apartmentCount = 4): FloorConfig {
  return {
    floorNumber,
    apartments: Array.from({ length: apartmentCount }, (_, index) =>
      buildApartmentName(floorNumber, index + 1),
    ),
  };
}

function createTower(id: number, name: string, floorCount: number): TowerConfig {
  return {
    id,
    name,
    floors: Array.from({ length: floorCount }, (_, index) => createFloor(index + 1)),
    selectedFloor: 1,
    isEditing: false,
  };
}

function syncFloors(existingFloors: FloorConfig[], floorCount: number) {
  const nextCount = clampCount(floorCount);

  return Array.from({ length: nextCount }, (_, index) => {
    const floorNumber = index + 1;
    const existingFloor = existingFloors[index];

    if (!existingFloor) {
      return createFloor(floorNumber);
    }

    return {
      floorNumber,
      apartments:
        existingFloor.apartments.length > 0
          ? existingFloor.apartments
          : createFloor(floorNumber).apartments,
    };
  });
}

const initialTowers: TowerConfig[] = [
  {
    id: 1,
    name: "Torre A",
    floors: [
      { floorNumber: 1, apartments: ["101", "102", "103", "104"] },
      { floorNumber: 2, apartments: ["201", "202", "203", "204"] },
      { floorNumber: 3, apartments: ["301", "302", "303"] },
      { floorNumber: 4, apartments: ["401", "402", "403"] },
      { floorNumber: 5, apartments: ["501", "502", "503"] },
    ],
    selectedFloor: 1,
    isEditing: false,
  },
  {
    id: 2,
    name: "Torre B",
    floors: [
      { floorNumber: 1, apartments: ["101", "102"] },
      { floorNumber: 2, apartments: ["201", "202", "203"] },
      { floorNumber: 3, apartments: ["301", "302", "303", "304"] },
      { floorNumber: 4, apartments: ["401", "402"] },
    ],
    selectedFloor: 1,
    isEditing: false,
  },
];

export default function Settings() {
  const [towers, setTowers] = useState<TowerConfig[]>(initialTowers);

  const totalFloors = towers.reduce((sum, tower) => sum + tower.floors.length, 0);
  const totalUnits = towers.reduce(
    (sum, tower) =>
      sum + tower.floors.reduce((floorSum, floor) => floorSum + floor.apartments.length, 0),
    0,
  );

  const addTower = () => {
    setTowers((current) => [
      ...current,
      createTower(Date.now(), `Torre ${String.fromCharCode(65 + current.length)}`, 3),
    ]);
  };

  const removeTower = (towerId: number) => {
    setTowers((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((tower) => tower.id !== towerId);
    });
  };

  const toggleTowerEditing = (towerId: number) => {
    setTowers((current) =>
      current.map((tower) =>
        tower.id === towerId ? { ...tower, isEditing: !tower.isEditing } : tower,
      ),
    );
  };

  const updateTowerName = (towerId: number, value: string) => {
    setTowers((current) =>
      current.map((tower) => (tower.id === towerId ? { ...tower, name: value } : tower)),
    );
  };

  const updateTowerFloorCount = (towerId: number, value: string) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        const parsedValue = Number.parseInt(value, 10);
        const nextCount = clampCount(Number.isNaN(parsedValue) ? 1 : parsedValue);
        const nextFloors = syncFloors(tower.floors, nextCount);

        return {
          ...tower,
          floors: nextFloors,
          selectedFloor: Math.min(tower.selectedFloor, nextFloors.length),
        };
      }),
    );
  };

  const selectFloor = (towerId: number, value: string) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        const parsedValue = Number.parseInt(value, 10);
        const nextFloor = clampCount(Number.isNaN(parsedValue) ? 1 : parsedValue);

        return {
          ...tower,
          selectedFloor: Math.min(nextFloor, tower.floors.length),
        };
      }),
    );
  };

  const updateApartmentName = (
    towerId: number,
    floorNumber: number,
    apartmentIndex: number,
    value: string,
  ) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        return {
          ...tower,
          floors: tower.floors.map((floor) => {
            if (floor.floorNumber !== floorNumber) {
              return floor;
            }

            return {
              ...floor,
              apartments: floor.apartments.map((apartment, index) =>
                index === apartmentIndex ? value : apartment,
              ),
            };
          }),
        };
      }),
    );
  };

  const addApartment = (towerId: number, floorNumber: number) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        return {
          ...tower,
          floors: tower.floors.map((floor) => {
            if (floor.floorNumber !== floorNumber) {
              return floor;
            }

            return {
              ...floor,
              apartments: [
                ...floor.apartments,
                buildApartmentName(floor.floorNumber, floor.apartments.length + 1),
              ],
            };
          }),
        };
      }),
    );
  };

  const removeApartment = (towerId: number, floorNumber: number, apartmentIndex: number) => {
    setTowers((current) =>
      current.map((tower) => {
        if (tower.id !== towerId) {
          return tower;
        }

        return {
          ...tower,
          floors: tower.floors.map((floor) => {
            if (floor.floorNumber !== floorNumber || floor.apartments.length === 1) {
              return floor;
            }

            return {
              ...floor,
              apartments: floor.apartments.filter((_, index) => index !== apartmentIndex),
            };
          }),
        };
      }),
    );
  };

  return (
    <main className="settingsPage">
      <section className="settingsHero">
        <p className="settingsEyebrow">Configuracion general</p>
        <h1>Configura LobbyPack a tu manera</h1>
        <p className="settingsLead">
          Ajusta notificaciones, recepcion de paquetes y permisos del equipo desde un solo
          panel.
        </p>
      </section>

      <section className="settingsGrid">
        <article className="settingsCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Condominio</p>
              <h2>Lobby principal</h2>
            </div>
            <span className="settingsBadge">Activo</span>
          </div>

          <div className="settingsForm">
            <label className="settingsField">
              <span>Nombre del edificio</span>
              <input type="text" defaultValue="LobbyPack Plaza Sur" />
            </label>
            <label className="settingsField">
              <span>Correo de contacto</span>
              <input type="email" defaultValue="recepcion@lobbypack.cl" />
            </label>
            <label className="settingsField">
              <span>Horario de recepcion</span>
              <input type="text" defaultValue="08:00 a 22:00" />
            </label>
            <label className="settingsField">
              <span>Direccion</span>
              <input type="text" defaultValue="Av. Plaza Sur 245, Santiago" />
            </label>
            <label className="settingsField">
              <span>Contrasena</span>
              <input type="password" defaultValue="1234" />
            </label>
          </div>

          <div className="settingsActions">
            <button type="button" className="secondaryButton">
              Restaurar
            </button>
            <button type="button" className="primaryButton">
              Guardar cambios
            </button>
          </div>
        </article>

        <article className="settingsCard">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Preferencias</p>
              <h2>Automatizaciones</h2>
            </div>
          </div>

          <div className="settingsOptionList">
            {preferenceItems.map((item) => (
              <label key={item.title} className="settingsOption">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
                <input type="checkbox" defaultChecked />
              </label>
            ))}
          </div>
        </article>

        <article className="settingsCard settingsCardWide">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Estructura</p>
              <h2>Torres, pisos y departamentos</h2>
            </div>
            <button type="button" className="secondaryButton" onClick={addTower}>
              Agregar torre
            </button>
          </div>

          <p className="settingsSectionLead">
            Cada torre queda visible como ficha fija. Si necesitas cambiar nombre, pisos o
            departamentos, entra a editar esa torre.
          </p>

          <div className="settingsStats">
            <div className="settingsStat">
              <strong>{towers.length}</strong>
              <span>Torres registradas</span>
            </div>
            <div className="settingsStat">
              <strong>{totalFloors}</strong>
              <span>Pisos en total</span>
            </div>
            <div className="settingsStat">
              <strong>{totalUnits}</strong>
              <span>Departamentos registrados</span>
            </div>
          </div>

          <div className="towerList">
            {towers.map((tower) => {
              const selectedFloor =
                tower.floors.find((floor) => floor.floorNumber === tower.selectedFloor) ??
                tower.floors[0];
              const totalTowerUnits = tower.floors.reduce(
                (sum, floor) => sum + floor.apartments.length,
                0,
              );

              return (
                <section key={tower.id} className="towerCard">
                  <div className="towerCardHeader">
                    <div>
                      <p className="settingsLabel">Torre</p>
                      <h3>{tower.name}</h3>
                    </div>

                    <div className="towerHeaderActions">
                      <button
                        type="button"
                        className="secondaryButton"
                        onClick={() => toggleTowerEditing(tower.id)}
                      >
                        {tower.isEditing ? "Cerrar edicion" : "Editar"}
                      </button>
                      <button
                        type="button"
                        className="towerRemoveButton"
                        onClick={() => removeTower(tower.id)}
                        disabled={towers.length === 1}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>

                  <div className="towerSummaryGrid">
                    <div className="towerSummaryItem">
                      <span>Nombre de la torre</span>
                      <strong>{tower.name}</strong>
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

                  {tower.isEditing ? (
                    <div className="towerEditor">
                      <div className="settingsForm towerForm">
                        <label className="settingsField">
                          <span>Nombre de la torre</span>
                          <input
                            type="text"
                            value={tower.name}
                            onChange={(event) =>
                              updateTowerName(tower.id, event.target.value)
                            }
                          />
                        </label>

                        <label className="settingsField">
                          <span>Cantidad de pisos</span>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={tower.floors.length}
                            onChange={(event) =>
                              updateTowerFloorCount(tower.id, event.target.value)
                            }
                          />
                        </label>
                      </div>

                      <div className="floorEditorList">
                        {tower.floors.map((floor) => (
                          <section key={`${tower.id}-${floor.floorNumber}`} className="floorEditor">
                            <div className="floorEditorHeader">
                              <div>
                                <p className="settingsLabel">Piso</p>
                                <h4>Piso {floor.floorNumber}</h4>
                              </div>
                              <button
                                type="button"
                                className="secondaryButton"
                                onClick={() => addApartment(tower.id, floor.floorNumber)}
                              >
                                Agregar departamento
                              </button>
                            </div>

                            <div className="apartmentEditorGrid">
                              {floor.apartments.map((apartment, apartmentIndex) => (
                                <div
                                  key={`${tower.id}-${floor.floorNumber}-${apartmentIndex}`}
                                  className="apartmentEditorItem"
                                >
                                  <input
                                    type="text"
                                    value={apartment}
                                    onChange={(event) =>
                                      updateApartmentName(
                                        tower.id,
                                        floor.floorNumber,
                                        apartmentIndex,
                                        event.target.value,
                                      )
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="towerRemoveButton apartmentRemoveButton"
                                    onClick={() =>
                                      removeApartment(
                                        tower.id,
                                        floor.floorNumber,
                                        apartmentIndex,
                                      )
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
                          value={tower.selectedFloor}
                          onChange={(event) => selectFloor(tower.id, event.target.value)}
                        >
                          {tower.floors.map((floor) => (
                            <option
                              key={`${tower.id}-floor-${floor.floorNumber}`}
                              value={floor.floorNumber}
                            >
                              Piso {floor.floorNumber}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="towerPreviewChips">
                      {selectedFloor.apartments.map((apartment) => (
                        <span key={`${tower.id}-${selectedFloor.floorNumber}-${apartment}`} className="towerChip">
                          {apartment}
                        </span>
                      ))}
                    </div>

                    <p className="towerPreviewText">
                      {tower.name} tiene {selectedFloor.apartments.length} departamentos en el
                      piso {selectedFloor.floorNumber}.
                    </p>
                  </div>
                </section>
              );
            })}
          </div>
        </article>

        <article className="settingsCard settingsCardWide">
          <div className="settingsCardHeader">
            <div>
              <p className="settingsLabel">Equipo</p>
              <h2>Accesos y permisos</h2>
            </div>
            <button type="button" className="secondaryButton">
              Invitar usuario
            </button>
          </div>

          <div className="settingsTable">
            {teamItems.map((item) => (
              <div key={item.name} className="settingsRow">
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.role}</p>
                </div>
                <span className="settingsRole">{item.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
