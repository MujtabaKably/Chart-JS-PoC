import { useEffect, useReducer, useRef, useState } from "react";
import _ from "lodash";
import "./styles.css";
import { Pie, Doughnut, Bar, Line } from "react-chartjs-2";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import { makeStyles } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";

const baseUrl = "https://staging-api.vivelogis.com/v1";
const apiUrl = "mdm/processes/order-follow-up";
const userName = "global_admin@vivelogis.com";
const password = "1234test123!";
const tenantId = "5fd06cd0759b5d26c3a77ee5";
const orgId = "5fd060d64e8b60f69dd7253a";
const recordCount = 5000;

const useStyles = makeStyles((theme) => ({
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120
  },
  selectEmpty: {
    marginTop: theme.spacing(2)
  }
}));

const chartTypes = {
  Pie: {
    graph: Pie,
    groups: []
  },
  Bar: {
    graph: Bar,
    groups: []
  },
  Line: {
    graph: Line,
    groups: []
  },
  Doughnut: {
    graph: Doughnut,
    groups: []
  }
};

function randomRGBA(alpha = 0.5) {
  var o = Math.round,
    r = Math.random,
    s = 255;

  const red = o(r() * s);
  const green = o(r() * s);
  const blue = o(r() * s);
  if (!alpha) alpha = r().toFixed(1);
  return {
    background: `rgba(${red},${green},${blue},${alpha})`,
    border: `rgb(${red},${green},${blue})`
  };
}

const genData = (data, chart, group, against) => {
  if (chart === "Pie" || chart === "Doughnut") {
    const labels = Array.from(
      new Set(data.map((fol) => fol[group]).filter(Boolean))
    );
    const colors = labels.map(() => randomRGBA());

    return {
      labels,
      datasets: [
        {
          data: labels.map(
            (label) =>
              data.filter((dataPoint) => dataPoint[group] === label).length
          ),
          backgroundColor: colors.map((col) => col.background),
          borderColor: colors.map((col) => col.border),
          borderWidth: 1
        }
      ]
    };
  }

  if (chart === "Bar" || chart === "Line") {
    const labels = Array.from(
      new Set(data.map((fol) => fol[against]).filter(Boolean))
    );
    const groups = Array.from(
      new Set(data.map((fol) => fol[group]).filter(Boolean))
    );

    return {
      labels,
      datasets: groups.map((selGroup) => {
        const color = randomRGBA();
        return {
          label: selGroup,
          data: labels.map(
            (label) =>
              data.filter(
                (dataPoint) =>
                  dataPoint[against] === label && dataPoint[group] === selGroup
              ).length
          ),
          fill: false,
          backgroundColor: color.background,
          borderColor: color.border,
          yAxisID: "Count"
        };
      })
    };
  }

  return {};
};

export default function App() {
  const [pageState, setPageState] = useState("Init");
  const [data, setData] = useState([]);
  const [chart, setChart] = useState("Pie");
  const [group, setGroup] = useState("");
  const [against, setAgainst] = useState("");
  const chartDiv = useRef(null);
  const groups = Object.keys(data[0] || {});
  const againsts = Object.keys(data[0] || {});

  const classes = useStyles();

  useEffect(() => {
    setPageState("Logging In");
    async function fetchData() {
      try {
        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
          headers: {
            accept: "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json;charset=UTF-8",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "cross-site"
          },
          body: `{"username":"${userName}","password":"${password}"}`,
          method: "POST"
        });
        const loginRes = await loginResponse.json();

        setPageState("Loading Data");
        const response = await fetch(
          `${baseUrl}/${apiUrl}?tenantId=${tenantId}&orgId=${orgId}&page=1&perPage=${recordCount}`,
          {
            headers: {
              accept: "application/json, text/plain, */*",
              "accept-language": "en-US,en;q=0.9",
              authorization: `Bearer ${loginRes.token}`,
              "sec-fetch-dest": "empty",
              "sec-fetch-mode": "cors",
              "sec-fetch-site": "cross-site"
            },
            body: null,
            method: "GET"
          }
        );
        const jsonData = await response.json();
        const { data: responseData = [] } = jsonData;
        setData(responseData);
        setPageState("Loaded");
      } catch (error) {
        console.log(error);
      }
    }
    fetchData();
  }, []);

  const ChartGraph = chartTypes[chart] ? chartTypes[chart].graph : null;

  const graphData = genData(data, chart, group, against);

  return (
    <div className="App">
      <h1>{apiUrl}</h1>
      <FormControl className={classes.formControl}>
        <InputLabel>Chart Type</InputLabel>
        <Select
          value={chart}
          onChange={({ target: { value } }) => {
            setChart(value);
          }}
        >
          <MenuItem value={"Bar"}>Bar</MenuItem>
          <MenuItem value={"Line"}>Line</MenuItem>
          <MenuItem value={"Doughnut"}>Doughnut</MenuItem>
          <MenuItem value={"Pie"}>Pie</MenuItem>
        </Select>
      </FormControl>
      <FormControl className={classes.formControl}>
        <InputLabel>Grouping</InputLabel>
        <Select
          value={group}
          onChange={({ target: { value } }) => {
            setGroup(value);
          }}
        >
          {groups.map((group) => (
            <MenuItem key={group} value={group}>
              {group}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {chart === "Line" || chart === "Bar" ? (
        <FormControl className={classes.formControl}>
          <InputLabel>Against</InputLabel>
          <Select
            value={against}
            onChange={({ target: { value } }) => {
              setAgainst(value);
            }}
          >
            {againsts.map((group) => (
              <MenuItem key={group} value={group}>
                {group}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
      {ChartGraph && pageState === "Loaded" ? (
        <div className="graph-div" ref={chartDiv}>
          <ChartGraph
            data={graphData}
            height={
              chartDiv && chartDiv.current ? chartDiv.current.offsetHeight : 400
            }
            options={{
              responsive: true,
              maintainAspectRatio: false,
              ...(chart === "Line" || chart === "Bar"
                ? {
                    scales: {
                      yAxes: [
                        {
                          type: "linear",
                          display: true,
                          position: "left",
                          id: "Count"
                        }
                      ]
                    }
                  }
                : {})
            }}
          />
        </div>
      ) : (
        <div style={{ textAlign: "center", margin: "100px auto" }}>
          <div>
            <CircularProgress size={80} />
          </div>
          {pageState}
        </div>
      )}
    </div>
  );
}
