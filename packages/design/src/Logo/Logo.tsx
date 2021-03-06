import { useColorMode } from "@chakra-ui/react";

export default function Logo() {
  const { colorMode } = useColorMode();
  const fill = colorMode !== "dark" ? "#000000" : "#ffffff";
  return (
    <svg
      height="44px"
      version="1.1"
      viewBox="0 0 24 44"
      width="24px"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <title>comma</title>
      <defs />
      <g
        id="comma"
        fill="none"
        fillRule="evenodd"
        stroke="none"
        strokeWidth="1"
      >
        <g
          id="comma_fill"
          fill={fill}
          transform="translate(-86.000000, -22.000000)"
        >
          <g id="comma_fill_1">
            <g id="comma_fill_1_group">
              <g
                id="comma_fill_1_group_2"
                transform="translate(86.000000, 22.000000)"
              >
                <path
                  d="M2.3325273,44 C2.3325273,42.9819019 2.25294268,42.1290181 2.37000751,41.3070321 C2.41990001,40.9564305 2.82901847,40.5810595 3.16268975,40.3693706 C4.78942848,39.3369727 6.55659633,38.5126886 8.07113779,37.32861 C12.9769087,33.4931864 15.8847893,28.4440632 16.0437152,21.8852845 C16.0887401,20.0229846 15.4041177,19.5577289 13.8399272,20.2831908 C9.32477801,22.3776079 4.46938637,21.1496084 1.87814052,17.2574961 C-0.947721751,13.012484 -0.549798677,7.36046894 2.83607643,3.65221184 C7.16090397,-1.08410221 14.2770341,-1.22582393 19.1842653,3.29752453 C22.1237851,6.00709044 23.5205316,9.50570155 23.8688055,13.4851451 C25.0365333,26.8169447 18.349722,37.8056121 6.17936039,42.6328324 C4.97488253,43.1103451 3.73973905,43.5025696 2.3325273,44"
                  id="Fill-3"
                />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
