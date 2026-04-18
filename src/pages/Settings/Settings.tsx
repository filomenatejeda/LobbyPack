import { useState } from "react";
import TowerCard from "../../components/Settings/TowerCard";
import type { TowerConfig } from "../../types/settings";
import { initialTowers, preferenceItems, teamItems } from "../../data/settingsData";
import {
  buildApartmentName,
  clampCount,
  createTower,
  syncFloors,
} from "../../utils/towerUtils";
import "./Settings.css";

export default function Settings() {
  const [towers, setTowers] = useState<TowerConfig[]>(initialTowers);

  // Estos totales alimentan las tarjetas resumen y se recalculan desde el modelo de torres.
  const totalFloors = towers.reduce((sum, tower) => sum + tower.floors.length, 0);
  const totalUnits = towers.reduce(
    (sum, tower) =>
      sum + tower.floors.reduce((floorSum, floor) => floorSum + floor.apartments.length, 0),
    0,
  );

  // Las torres nuevas reciben una letra secuencial para mantener legibles los datos mock.
  const addTower = () => {
    setTowers((current) => [
      ...current,
      createTower(Date.now(), `Torre ${String.fromCharCode(65 + current.length)}`, 3),
    ]);
  };

  // Mantiene al menos una torre en pantalla para no dejar esta vista vacía.
  const removeTower = (towerId: number) => {
    setTowers((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((tower) => tower.id !== towerId);
    });
  };

  // El modo edición se activa de forma independiente por cada tarjeta de torre.
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

  // Al cambiar la cantidad de pisos se reconstruye la lista preservando datos existentes cuando se puede.
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

  // Ajusta el piso seleccionado para que la vista previa no apunte a un piso inexistente.
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

  // La edición de departamentos se limita a una torre y un piso por vez.
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

  // Los nombres de nuevos departamentos se generan desde el número de piso siguiendo la convención mock.
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

  // Evita borrar el último departamento de un piso para que cada piso conserve al menos una unidad.
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
        <p className="settingsEyebrow">Configuración general</p>
        <h1>Configura LobbyPack a tu manera</h1>
        <p className="settingsLead">
          Ajusta notificaciones, recepción de paquetes y permisos del equipo desde un solo
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
              <span>Horario de recepción</span>
              <input type="text" defaultValue="08:00 a 22:00" />
            </label>
            <label className="settingsField">
              <span>Dirección</span>
              <input type="text" defaultValue="Av. Plaza Sur 245, Santiago" />
            </label>
            <label className="settingsField">
              <span>Contraseña</span>
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
              const totalTowerUnits = tower.floors.reduce(
                (sum, floor) => sum + floor.apartments.length,
                0,
              );

              return (
                <TowerCard
                  key={tower.id}
                  tower={tower}
                  totalTowerUnits={totalTowerUnits}
                  canRemove={towers.length > 1}
                  onToggleEditing={toggleTowerEditing}
                  onRemove={removeTower}
                  onUpdateName={updateTowerName}
                  onUpdateFloorCount={updateTowerFloorCount}
                  onSelectFloor={selectFloor}
                  onAddApartment={addApartment}
                  onUpdateApartmentName={updateApartmentName}
                  onRemoveApartment={removeApartment}
                />
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
